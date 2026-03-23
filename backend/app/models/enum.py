from sqlalchemy import Enum as SQLEnum

# User roles enum
UserRole = SQLEnum('ADMIN', 'USER', name='userrole')

# Other enums can be added here as needed
