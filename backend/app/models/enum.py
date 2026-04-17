from sqlalchemy import Enum as SQLEnum

# User roles enum
UserRole = SQLEnum('ADMIN', 'USER', name='userrole')

ExpenseType = SQLEnum('GOODS_PURCHASE', 'OPERATING_EXPENSE','TRANSPORT','RENT','OTHER', name='expense_type')


PaymentType =SQLEnum('CASH','TRANSFER','POS', name='payment_type')

# Other enums can be added here as needed
