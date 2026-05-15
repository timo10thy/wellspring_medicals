from app.models.stock_movement import StockMovement

def log_movement(
    db,
    stock,
    movement_type: str,
    quantity_before: int,
    quantity_after: int,
    performed_by: str,
    reference_id: int = None,
    note: str = None,
):
    movement = StockMovement(
        stock_id         = stock.id,
        product_id       = stock.product_id,
        movement_type    = movement_type,
        quantity_before  = quantity_before,
        quantity_changed = abs(quantity_after - quantity_before),
        quantity_after   = quantity_after,
        performed_by     = performed_by,
        reference_id     = reference_id,
        note             = note,
    )
    db.add(movement)