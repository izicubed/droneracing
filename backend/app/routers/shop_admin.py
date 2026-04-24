from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.shop import InventoryItem, Purchase, PurchaseStatus, Sale
from app.models.user import User, UserRole
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin/shop", tags=["shop-admin"])


async def require_shop_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.superadmin, UserRole.admin):
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


class PurchaseIn(BaseModel):
    item_name: str
    quantity: int = Field(gt=0)
    unit_cost_usd: float = Field(ge=0)
    total_cost_usd: float = Field(ge=0)
    transport_cost_usd: float = Field(default=0, ge=0)
    commission_cost_usd: float = Field(default=0, ge=0)
    supplier: str | None = None
    status: PurchaseStatus = PurchaseStatus.paid
    notes: str | None = None


class SaleIn(BaseModel):
    item_name: str
    quantity: int = Field(gt=0)
    unit_price_usd: float = Field(ge=0)
    total_price_usd: float = Field(ge=0)
    customer_name: str
    customer_contact: str | None = None
    notes: str | None = None


async def _get_inventory_item(db: AsyncSession, item_name: str) -> InventoryItem | None:
    result = await db.execute(select(InventoryItem).where(InventoryItem.item_name == item_name))
    return result.scalar_one_or_none()


async def _apply_purchase_to_inventory(db: AsyncSession, purchase: Purchase) -> None:
    if purchase.inventory_applied or purchase.status != PurchaseStatus.completed:
        return
    item = await _get_inventory_item(db, purchase.item_name)
    if item is None:
        item = InventoryItem(item_name=purchase.item_name, quantity=0, total_cost_usd=0)
        db.add(item)
        await db.flush()
    item.quantity += purchase.quantity
    item.total_cost_usd += purchase.total_cost_usd + purchase.transport_cost_usd + purchase.commission_cost_usd
    purchase.inventory_applied = True


async def _revert_purchase_from_inventory(db: AsyncSession, purchase: Purchase) -> None:
    if not purchase.inventory_applied:
        return
    item = await _get_inventory_item(db, purchase.item_name)
    if item is None:
        raise HTTPException(status_code=400, detail="Inventory item missing for completed purchase")
    if item.quantity < purchase.quantity:
        raise HTTPException(status_code=400, detail="Cannot revert purchase: inventory already consumed")
    item.quantity -= purchase.quantity
    item.total_cost_usd = max(0, item.total_cost_usd - (purchase.total_cost_usd + purchase.transport_cost_usd + purchase.commission_cost_usd))
    purchase.inventory_applied = False


async def _consume_inventory_for_sale(db: AsyncSession, item_name: str, quantity: int) -> float:
    item = await _get_inventory_item(db, item_name)
    if item is None or item.quantity < quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")
    avg_cost = item.total_cost_usd / item.quantity if item.quantity > 0 else 0
    cogs = avg_cost * quantity
    item.quantity -= quantity
    item.total_cost_usd = max(0, item.total_cost_usd - cogs)
    return round(cogs, 2)


async def _restore_inventory_from_sale(db: AsyncSession, sale: Sale) -> None:
    item = await _get_inventory_item(db, sale.item_name)
    if item is None:
        item = InventoryItem(item_name=sale.item_name, quantity=0, total_cost_usd=0)
        db.add(item)
        await db.flush()
    item.quantity += sale.quantity
    item.total_cost_usd += sale.cogs_usd


@router.get("/dashboard")
async def get_dashboard(_: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    sales_sum = float((await db.execute(select(func.coalesce(func.sum(Sale.total_price_usd), 0)))).scalar() or 0)
    cogs_sum = float((await db.execute(select(func.coalesce(func.sum(Sale.cogs_usd), 0)))).scalar() or 0)
    purchases_base = float((await db.execute(select(func.coalesce(func.sum(Purchase.total_cost_usd), 0)))).scalar() or 0)
    purchases_transport = float((await db.execute(select(func.coalesce(func.sum(Purchase.transport_cost_usd), 0)))).scalar() or 0)
    purchases_commission = float((await db.execute(select(func.coalesce(func.sum(Purchase.commission_cost_usd), 0)))).scalar() or 0)
    purchases_sum = purchases_base + purchases_transport + purchases_commission
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
    items = (await db.execute(select(Purchase).order_by(Purchase.created_at.desc()))).scalars().all()
    return items


@router.post("/purchases")
async def create_purchase(body: PurchaseIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    purchase = Purchase(**body.model_dump())
    db.add(purchase)
    await db.flush()
    await _apply_purchase_to_inventory(db, purchase)
    await db.commit()
    await db.refresh(purchase)
    return purchase


@router.patch("/purchases/{purchase_id}")
async def update_purchase(purchase_id: int, body: PurchaseIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    purchase = await db.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    was_completed = purchase.status == PurchaseStatus.completed and purchase.inventory_applied
    if was_completed:
        await _revert_purchase_from_inventory(db, purchase)

    for key, value in body.model_dump().items():
        setattr(purchase, key, value)

    await _apply_purchase_to_inventory(db, purchase)
    await db.commit()
    await db.refresh(purchase)
    return purchase


@router.delete("/purchases/{purchase_id}")
async def delete_purchase(purchase_id: int, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    purchase = await db.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if purchase.status == PurchaseStatus.completed and purchase.inventory_applied:
        await _revert_purchase_from_inventory(db, purchase)
    await db.delete(purchase)
    await db.commit()
    return {"ok": True}


@router.get("/sales")
async def list_sales(_: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    items = (await db.execute(select(Sale).order_by(Sale.created_at.desc()))).scalars().all()
    return items


@router.post("/sales")
async def create_sale(body: SaleIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    cogs = await _consume_inventory_for_sale(db, body.item_name, body.quantity)
    sale = Sale(**body.model_dump(), cogs_usd=cogs)
    db.add(sale)
    await db.commit()
    await db.refresh(sale)
    return sale


@router.patch("/sales/{sale_id}")
async def update_sale(sale_id: int, body: SaleIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    sale = await db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await _restore_inventory_from_sale(db, sale)
    cogs = await _consume_inventory_for_sale(db, body.item_name, body.quantity)
    for key, value in body.model_dump().items():
        setattr(sale, key, value)
    sale.cogs_usd = cogs
    await db.commit()
    await db.refresh(sale)
    return sale


@router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: int, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    sale = await db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await _restore_inventory_from_sale(db, sale)
    await db.delete(sale)
    await db.commit()
    return {"ok": True}
