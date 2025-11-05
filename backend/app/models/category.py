from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Self-referential relationship
    parent = relationship("Category", remote_side=[id], backref="children")

    # Relationships
    products = relationship("Product", back_populates="category")
