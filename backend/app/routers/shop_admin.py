from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.shop import IOY, InventoryItem, Payer, Purchase, PurchaseFee, PurchaseItem, PurchaseStatus, Sale, SaleFee, SaleItem
from app.models.user import User, UserRole
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin/shop", tags=["shop-admin"])

_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


async def require_shop_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.superadmin, UserRole.admin):
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


class PurchaseItemIn(BaseModel):
    item_name: str
    quantity: int = Field(gt=0)
    unit_cost_usd: float = Field(ge=0)
    total_cost_usd: float = Field(ge=0)
    paid_by: Payer | None = None


class PurchaseFeeIn(BaseModel):
    name: str
    amount_usd: float = Field(ge=0)
    paid_by: Payer | None = None


class PurchaseIn(BaseModel):
    items: list[PurchaseItemIn]
    fees: list[PurchaseFeeIn] = Field(default_factory=list)
    supplier: str | None = None
    status: PurchaseStatus = PurchaseStatus.paid
    purchase_date: date | None = None
    notes: str | None = None


class SaleItemIn(BaseModel):
    item_name: str
    quantity: int = Field(gt=0)
    unit_price_usd: float = Field(ge=0)
    total_price_usd: float = Field(ge=0)


class SaleFeeIn(BaseModel):
    name: str
    amount_usd: float = Field(ge=0)
    received_by: Payer | None = None


class SaleIn(BaseModel):
    items: list[SaleItemIn]
    fees: list[SaleFeeIn] = Field(default_factory=list)
    customer_name: str
    customer_contact: str | None = None
    sale_date: date | None = None
    notes: str | None = None
    received_by: Payer | None = None


async def _get_inventory_item(db: AsyncSession, item_name: str) -> InventoryItem | None:
    result = await db.execute(select(InventoryItem).where(InventoryItem.item_name == item_name))
    return result.scalar_one_or_none()


def _purchase_goods_total(purchase: Purchase) -> float:
    return round(sum(item.total_cost_usd for item in purchase.items), 2)


def _purchase_fees_total(purchase: Purchase) -> float:
    return round(sum(fee.amount_usd for fee in purchase.fees), 2)


def _sale_items_total(sale: Sale) -> float:
    return round(sum(item.total_price_usd for item in sale.items), 2)


def _sale_fees_total(sale: Sale) -> float:
    return round(sum(fee.amount_usd for fee in sale.fees), 2)


def _sale_total(sale: Sale) -> float:
    return round(_sale_items_total(sale) + _sale_fees_total(sale), 2)


def _sale_cogs(sale: Sale) -> float:
    return round(sum(item.cogs_usd for item in sale.items), 2)


async def _apply_purchase_to_inventory(db: AsyncSession, purchase: Purchase) -> None:
    if purchase.inventory_applied or purchase.status != PurchaseStatus.completed:
        return
    extra_total = _purchase_fees_total(purchase)
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
    extra_total = _purchase_fees_total(purchase)
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
    goods_total = _purchase_goods_total(purchase)
    fees_total = _purchase_fees_total(purchase)
    return {
        "id": purchase.id,
        "supplier": purchase.supplier,
        "status": purchase.status,
        "purchase_date": purchase.purchase_date.isoformat() if purchase.purchase_date else None,
        "fees": [{"id": f.id, "name": f.name, "amount_usd": f.amount_usd, "paid_by": f.paid_by} for f in purchase.fees],
        "fees_total_usd": fees_total,
        "goods_total_usd": goods_total,
        "total_cost_usd": round(goods_total + fees_total, 2),
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
                "paid_by": item.paid_by,
            }
            for item in purchase.items
        ],
    }


def _sale_to_dict(sale: Sale) -> dict:
    items_total = _sale_items_total(sale)
    fees_total = _sale_fees_total(sale)
    return {
        "id": sale.id,
        "customer_name": sale.customer_name,
        "customer_contact": sale.customer_contact,
        "notes": sale.notes,
        "sale_date": sale.sale_date.isoformat() if sale.sale_date else None,
        "items_total_usd": items_total,
        "fees_total_usd": fees_total,
        "total_price_usd": round(items_total + fees_total, 2),
        "cogs_usd": _sale_cogs(sale),
        "received_by": sale.received_by,
        "created_at": sale.created_at,
        "updated_at": sale.updated_at,
        "fees": [{"id": f.id, "name": f.name, "amount_usd": f.amount_usd, "received_by": f.received_by} for f in sale.fees],
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
    sales = (await db.execute(select(Sale).options(selectinload(Sale.items), selectinload(Sale.fees)))).scalars().all()
    purchases = (await db.execute(
        select(Purchase).options(selectinload(Purchase.items), selectinload(Purchase.fees))
    )).scalars().all()
    sales_sum = sum(_sale_total(sale) for sale in sales)
    cogs_sum = sum(_sale_cogs(sale) for sale in sales)
    purchases_sum = sum(_purchase_goods_total(p) + _purchase_fees_total(p) for p in purchases)

    # Per-person cash: sales/fees received by them minus purchases (items + fees) paid by them
    person_sales: dict[str, float] = {"cubed": 0.0, "vlad": 0.0}
    person_purchases: dict[str, float] = {"cubed": 0.0, "vlad": 0.0}

    for sale in sales:
        if sale.received_by:
            person_sales[sale.received_by] += _sale_items_total(sale)
        for fee in sale.fees:
            if fee.received_by:
                person_sales[fee.received_by] += fee.amount_usd

    for purchase in purchases:
        for item in purchase.items:
            if item.paid_by:
                person_purchases[item.paid_by] += item.total_cost_usd
        for fee in purchase.fees:
            if fee.paid_by:
                person_purchases[fee.paid_by] += fee.amount_usd

    return {
        "cash_usd": round(sales_sum - purchases_sum, 2),
        "sales_usd": round(sales_sum, 2),
        "profit_usd": round(sales_sum - cogs_sum, 2),
        "purchases_usd": round(purchases_sum, 2),
        "cubed_cash_usd": round(person_sales["cubed"] - person_purchases["cubed"], 2),
        "vlad_cash_usd": round(person_sales["vlad"] - person_purchases["vlad"], 2),
    }


@router.get("/chart-data")
async def get_chart_data(_: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    sales = (await db.execute(select(Sale).options(selectinload(Sale.items), selectinload(Sale.fees)))).scalars().all()
    purchases = (await db.execute(
        select(Purchase).options(selectinload(Purchase.items), selectinload(Purchase.fees))
    )).scalars().all()
    inventory = (await db.execute(select(InventoryItem))).scalars().all()

    monthly: dict[tuple, dict] = defaultdict(lambda: {"sales": 0.0, "purchases": 0.0})

    for sale in sales:
        d: date = sale.sale_date or sale.created_at.date()
        monthly[(d.year, d.month)]["sales"] += _sale_total(sale)

    for purchase in purchases:
        d = purchase.purchase_date or purchase.created_at.date()
        monthly[(d.year, d.month)]["purchases"] += _purchase_goods_total(purchase) + _purchase_fees_total(purchase)

    monthly_list = [
        {
            "month": f"{_MONTH_NAMES[k[1] - 1]} {k[0]}",
            "sales": round(monthly[k]["sales"], 2),
            "purchases": round(monthly[k]["purchases"], 2),
            "profit": round(monthly[k]["sales"] - monthly[k]["purchases"], 2),
        }
        for k in sorted(monthly.keys())
    ]

    inventory_list = sorted(
        [{"item_name": item.item_name, "value": round(item.total_cost_usd, 2), "quantity": item.quantity}
         for item in inventory if item.total_cost_usd > 0],
        key=lambda x: x["value"],
        reverse=True,
    )[:12]

    return {"monthly": monthly_list, "inventory": inventory_list}


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
    rows = (await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.items), selectinload(Purchase.fees))
        .order_by(Purchase.created_at.desc())
    )).scalars().all()
    return [_purchase_to_dict(row) for row in rows]


@router.post("/purchases")
async def create_purchase(body: PurchaseIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    purchase = Purchase(
        supplier=body.supplier,
        status=body.status,
        purchase_date=body.purchase_date,
        notes=body.notes,
        items=[PurchaseItem(**item.model_dump()) for item in body.items],
        fees=[PurchaseFee(**fee.model_dump()) for fee in body.fees],
    )
    db.add(purchase)
    await db.flush()
    await _apply_purchase_to_inventory(db, purchase)
    await db.commit()
    await db.refresh(purchase)
    return _purchase_to_dict(purchase)


@router.patch("/purchases/{purchase_id}")
async def update_purchase(purchase_id: int, body: PurchaseIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    purchase = await db.get(
        Purchase, purchase_id,
        options=[selectinload(Purchase.items), selectinload(Purchase.fees)],
    )
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if purchase.status == PurchaseStatus.completed and purchase.inventory_applied:
        await _revert_purchase_from_inventory(db, purchase)

    purchase.supplier = body.supplier
    purchase.status = body.status
    purchase.purchase_date = body.purchase_date
    purchase.notes = body.notes
    purchase.items = [PurchaseItem(**item.model_dump()) for item in body.items]
    purchase.fees = [PurchaseFee(**fee.model_dump()) for fee in body.fees]

    await db.flush()
    await _apply_purchase_to_inventory(db, purchase)
    await db.commit()
    await db.refresh(purchase)
    return _purchase_to_dict(purchase)


@router.delete("/purchases/{purchase_id}")
async def delete_purchase(purchase_id: int, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    purchase = await db.get(
        Purchase, purchase_id,
        options=[selectinload(Purchase.items), selectinload(Purchase.fees)],
    )
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if purchase.status == PurchaseStatus.completed and purchase.inventory_applied:
        await _revert_purchase_from_inventory(db, purchase)
    await db.delete(purchase)
    await db.commit()
    return {"ok": True}


@router.get("/sales")
async def list_sales(_: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(Sale).options(selectinload(Sale.items), selectinload(Sale.fees)).order_by(Sale.created_at.desc())
    )).scalars().all()
    return [_sale_to_dict(row) for row in rows]


@router.post("/sales")
async def create_sale(body: SaleIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    items: list[SaleItem] = []
    for line in body.items:
        cogs = await _consume_inventory_for_sale_line(db, line.item_name, line.quantity)
        items.append(SaleItem(**line.model_dump(), cogs_usd=cogs))
    fees = [SaleFee(**fee.model_dump()) for fee in body.fees if fee.name.strip()]
    sale = Sale(
        customer_name=body.customer_name,
        customer_contact=body.customer_contact,
        sale_date=body.sale_date,
        notes=body.notes,
        received_by=body.received_by,
        total_price_usd=round(sum(item.total_price_usd for item in items) + sum(f.amount_usd for f in fees), 2),
        cogs_usd=round(sum(item.cogs_usd for item in items), 2),
        items=items,
        fees=fees,
    )
    db.add(sale)
    await db.commit()
    await db.refresh(sale)
    return _sale_to_dict(sale)


@router.patch("/sales/{sale_id}")
async def update_sale(sale_id: int, body: SaleIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    sale = await db.get(Sale, sale_id, options=[selectinload(Sale.items), selectinload(Sale.fees)])
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await _restore_inventory_from_sale(db, sale)

    items: list[SaleItem] = []
    for line in body.items:
        cogs = await _consume_inventory_for_sale_line(db, line.item_name, line.quantity)
        items.append(SaleItem(**line.model_dump(), cogs_usd=cogs))

    fees = [SaleFee(**fee.model_dump()) for fee in body.fees if fee.name.strip()]
    sale.customer_name = body.customer_name
    sale.customer_contact = body.customer_contact
    sale.sale_date = body.sale_date
    sale.notes = body.notes
    sale.received_by = body.received_by
    sale.items = items
    sale.fees = fees
    sale.total_price_usd = round(sum(item.total_price_usd for item in items) + sum(f.amount_usd for f in fees), 2)
    sale.cogs_usd = round(sum(item.cogs_usd for item in items), 2)

    await db.commit()
    await db.refresh(sale)
    return _sale_to_dict(sale)


@router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: int, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    sale = await db.get(Sale, sale_id, options=[selectinload(Sale.items), selectinload(Sale.fees)])
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    await _restore_inventory_from_sale(db, sale)
    await db.delete(sale)
    await db.commit()
    return {"ok": True}


# ===== IOY =====

class IOYIn(BaseModel):
    debtor: Payer
    creditor: Payer
    item_name: str
    quantity: int = Field(default=1, gt=0)
    ioy_date: date | None = None
    notes: str | None = None
    settled: bool = False


def _ioy_to_dict(ioy: IOY) -> dict:
    return {
        "id": ioy.id,
        "debtor": ioy.debtor,
        "creditor": ioy.creditor,
        "item_name": ioy.item_name,
        "quantity": ioy.quantity,
        "ioy_date": ioy.ioy_date.isoformat() if ioy.ioy_date else None,
        "notes": ioy.notes,
        "settled": ioy.settled,
        "created_at": ioy.created_at,
        "updated_at": ioy.updated_at,
    }


@router.get("/ioy")
async def list_ioy(_: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(IOY).order_by(IOY.created_at.desc()))).scalars().all()
    return [_ioy_to_dict(row) for row in rows]


@router.post("/ioy")
async def create_ioy(body: IOYIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    record = IOY(**body.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return _ioy_to_dict(record)


@router.patch("/ioy/{ioy_id}")
async def update_ioy(ioy_id: int, body: IOYIn, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    record = await db.get(IOY, ioy_id)
    if not record:
        raise HTTPException(status_code=404, detail="IOY record not found")
    for field, value in body.model_dump().items():
        setattr(record, field, value)
    await db.commit()
    await db.refresh(record)
    return _ioy_to_dict(record)


@router.delete("/ioy/{ioy_id}")
async def delete_ioy(ioy_id: int, _: User = Depends(require_shop_admin), db: AsyncSession = Depends(get_db)):
    record = await db.get(IOY, ioy_id)
    if not record:
        raise HTTPException(status_code=404, detail="IOY record not found")
    await db.delete(record)
    await db.commit()
    return {"ok": True}
