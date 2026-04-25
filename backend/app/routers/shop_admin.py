from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.shop import InventoryItem, Purchase, PurchaseItem, PurchaseStatus, Sale, SaleItem
from app.models.user import User, UserRole
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin/shop", tags=["shop-admin"])


async def require_shop_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.superadmin, UserRole.admin):
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


class PurchaseItemIn(BaseModel):
    item_name: str
    quantity: int = Field(gt=0)
    unit_cost_usd: float = Field(ge=0)
    total_cost_usd: float = Field(ge=0)


class PurchaseIn(BaseModel):
    items: list[PurchaseItemIn]
    transport_cost_usd: float = Field(default=0, ge=0)
    commission_cost_usd: float = Field(default=0, ge=0)
    supplier: str | None = None
    status: PurchaseStatus = PurchaseStatus.paid
    notes: str | None = None


class SaleItemIn(BaseModel):
    item_name: str
    quantity: int = Field(gt=0)
    unit_price_usd: float = Field(ge=0)
    total_price_usd: float = Field(ge=0)


class SaleIn(BaseModel):
    items: list[SaleItemIn]
    customer_name: str
    customer_contact: str | None = None
    notes: str | None = None


async def _get_inventory_item(db: AsyncSession, item_name: str) -> InventoryItem | None:
    result = await db.execute(select(InventoryItem).where(InventoryItem.item_name == item_name))
    return result.scalar_one_or_none()


def _purchase_goods_total(purchase: Purchase) -> float:
    return round(sum(item.total_cost_usd for item in purchase.items), 2)


def _sale_total(sale: Sale) -> float:
    return round(sum(item.total_price_usd for item in sale.items), 2)


def _sale_cogs(sale: Sale) -> float:
    return round(sum(item.cogs_usd for item in sale.items), 2)


async def _apply_purchase_to_inventory(db: AsyncSession, purchase: Purchase) -> None:
    if purchase.inventory_applied or purchase.status != PurchaseStatus.completed:
        return
    extra_total = purchase.transport_cost_usd + purchase.commission_cost_usd
    goods_total = _purchase_goods_total(purchase)
    for line in purchase.items:
        item = await _get_inventory_item(db, line.item_name)
        if item is None:
            item = InventoryItem(item_name=line.item_name, quantity=0, total_cost_usd=0)
            db.add(item)
            await db.flush()
        line_extra = extra_total * (line.total_cost_usd / goods_total) if goods_total > 0 else 0
        item.quantity += line.quantity
        item.total_cost_usd += line.total_cost_usd + line_extra
    purchase.inventory_applied = True


async def _revert_purchase_from_inventory(db: AsyncSession, purchase: Purchase) -> None:
    if not purchase.inventory_applied:
        return
    extra_total = purchase.transport_cost_usd + purchase.commission_cost_usd
    goods_total = _purchase_goods_total(purchase)
    for line in purchase.items:
        item = await _get_inventory_item(db, line.item_name)
        if item is None or item.quantity < line.quantity:
            raise HTTPException(status_code=400, detail="Cannot revert purchase: inventory already consumed")
        line_extra = extra_total * (line.total_cost_usd / goods_total) if goods_total > 0 else 0
        item.quantity -= line.quantity
        item.total_cost_usd = max(0, item.total_cost_usd - (line.total_cost_usd + line_extra))
    purchase.inventory_applied = False


async def _consume_inventory_for_sale_line(db: AsyncSession, item_name: str, quantity: int) -> float:
    item = await _get_inventory_item(db, item_name)
    if item is None or item.quantity < quantity:
        raise HTTPException(status_code=400, detail=f"Not enough stock for {item_name}")
    avg_cost = item.total_cost_usd / item.quantity if item.quantity > 0 else 0
    cogs = round(avg_cost * quantity, 2)
    item.quantity -= quantity
    item.total_cost_usd = max(0, item.total_cost_usd - cogs)
    return cogs


async def _restore_inventory_from_sale(db: AsyncSession, sale: Sale) -> None:
    for line in sale.items:
        item = await _get_inventory_item(db, line.item_name)
        if item is None:
            item = InventoryItem(item_name=line.item_name, quantity=0, total_cost_usd=0)
            db.add(item)
            await db.flush()
        item.quantity += line.quantity
        item.total_cost_usd += line.cogs_usd


def _purchase_to_dict(purchase: Purchase) -> dict:
    return {
        "id": purchase.id,
        "supplier": purchase.supplier,
        "status": purchase.status,
        "transport_cost_usd": purchase.transport_cost_usd,
        "commission_cost_usd": purchase.commission_cost_usd,
        "goods_total_usd": _purchase_goods_total(purchase),
        "notes": purchase.notes,
        "created_at": purchase.created_at,
        "updated_at": purchase.updated_at,
        "items": [
            {
                "id": item.id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "unit_cost_usd": item.unit_cost_usd,
                "total_cost_usd": item.total_cost_usd,
            }
            for item in purchase.items
        ],
    }


def _sale_to_dict(sale: Sale) -> dict:
    return {
        "id": sale.id,
        "customer_name": sale.customer_name,
        "customer_contact": sale.customer_contact,
        "notes": sale.notes,
        "total_price_usd": _sale_total(sale),
        "cogs_usd": _sale_cogs(sale),
        "created_at": sale.created_at,
        "updated_at": sale.updated_at,
        "items": [
            {
                "id": item.id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "unit_price_usd": item.unit_price_usd,
                "total_price_usd": item.total_price_usd,
                "cogs_usd": item.cogs_usd,
            }
            for item in sale.items
        ],
    }


@router.get("/dashboard")
async def get_dashboard(_: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    sales = (await db.execute(select(Sale).options(selectinload(Sale.items)))).scalars().all()
    purchases = (await db.execute(select(Purchase).options(selectinload(Purchase.items)))).scalars().all()
    sales_sum = sum(_sale_total(sale) for sale in sales)
    cogs_sum = sum(_sale_cogs(sale) for sale in sales)
    purchases_sum = sum(_purchase_goods_total(p) + p.transport_cost_usd + p.commission_cost_usd for p in purchases)
    return {
        "cash_usd": round(sales_sum - purchases_sum, 2),
        "sales_usd": round(sales_sum, 2),
        "profit_usd": round(sales_sum - cogs_sum, 2),
        "purchases_usd": round(purchases_sum, 2),
    }


@router.get("/inventory")
async def list_inventory(_: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    items = (await db.execute(select(InventoryItem).order_by(InventoryItem.item_name.asc()))).scalars().all()
    return [
        {
            "id": item.id,
            "item_name": item.item_name,
            "quantity": item.quantity,
            "total_cost_usd": round(item.total_cost_usd, 2),
            "avg_cost_usd": round(item.total_cost_usd / item.quantity, 2) if item.quantity > 0 else 0,
            "updated_at": item.updated_at,
        }
        for item in items
    ]


@router.get("/purchases")
async def list_purchases(_: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Purchase).options(selectinload(Purchase.items)).order_by(Purchase.created_at.desc()))).scalars().all()
    return [_purchase_to_dict(row) for row in rows]


@router.post("/purchases")
async def create_purchase(body: PurchaseIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    purchase = Purchase(
        supplier=body.supplier,
        status=body.status,
        transport_cost_usd=body.transport_cost_usd,
        commission_cost_usd=body.commission_cost_usd,
        notes=body.notes,
        items=[PurchaseItem(**item.model_dump()) for item in body.items],
    )
    db.add(purchase)
    await db.flush()
    await _apply_purchase_to_inventory(db, purchase)
    await db.commit()
    await db.refresh(purchase)
    return _purchase_to_dict(purchase)


@router.patch("/purchases/{purchase_id}")
async def update_purchase(purchase_id: int, body: PurchaseIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    purchase = await db.get(Purchase, purchase_id, options=[selectinload(Purchase.items)])
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if purchase.status == PurchaseStatus.completed and purchase.inventory_applied:
        await _revert_purchase_from_inventory(db, purchase)

    purchase.supplier = body.supplier
    purchase.status = body.status
    purchase.transport_cost_usd = body.transport_cost_usd
    purchase.commission_cost_usd = body.commission_cost_usd
    purchase.notes = body.notes
    purchase.items = [PurchaseItem(**item.model_dump()) for item in body.items]

    await db.flush()
    await _apply_purchase_to_inventory(db, purchase)
    await db.commit()
    await db.refresh(purchase)
    return _purchase_to_dict(purchase)


@router.delete("/purchases/{purchase_id}")
async def delete_purchase(purchase_id: int, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    purchase = await db.get(Purchase, purchase_id, options=[selectinload(Purchase.items)])
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if purchase.status == PurchaseStatus.completed and purchase.inventory_applied:
        await _revert_purchase_from_inventory(db, purchase)
    await db.delete(purchase)
    await db.commit()
    return {"ok": True}


@router.get("/sales")
async def list_sales(_: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Sale).options(selectinload(Sale.items)).order_by(Sale.created_at.desc()))).scalars().all()
    return [_sale_to_dict(row) for row in rows]


@router.post("/sales")
async def create_sale(body: SaleIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    items: list[SaleItem] = []
    for line in body.items:
        cogs = await _consume_inventory_for_sale_line(db, line.item_name, line.quantity)
        items.append(SaleItem(**line.model_dump(), cogs_usd=cogs))
    sale = Sale(
        customer_name=body.customer_name,
        customer_contact=body.customer_contact,
        notes=body.notes,
        total_price_usd=round(sum(item.total_price_usd for item in items), 2),
        cogs_usd=round(sum(item.cogs_usd for item in items), 2),
        items=items,
    )
    db.add(sale)
    await db.commit()
    await db.refresh(sale)
    return _sale_to_dict(sale)


@router.patch("/sales/{sale_id}")
async def update_sale(sale_id: int, body: SaleIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    sale = await db.get(Sale, sale_id, options=[selectinload(Sale.items)])
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await _restore_inventory_from_sale(db, sale)

    items: list[SaleItem] = []
    for line in body.items:
        cogs = await _consume_inventory_for_sale_line(db, line.item_name, line.quantity)
        items.append(SaleItem(**line.model_dump(), cogs_usd=cogs))

    sale.customer_name = body.customer_name
    sale.customer_contact = body.customer_contact
    sale.notes = body.notes
    sale.items = items
    sale.total_price_usd = round(sum(item.total_price_usd for item in items), 2)
    sale.cogs_usd = round(sum(item.cogs_usd for item in items), 2)

    await db.commit()
    await db.refresh(sale)
    return _sale_to_dict(sale)


@router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: int, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    sale = await db.get(Sale, sale_id, options=[selectinload(Sale.items)])
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await _restore_inventory_from_sale(db, sale)
    await db.delete(sale)
    await db.commit()
    return {"ok": True}
