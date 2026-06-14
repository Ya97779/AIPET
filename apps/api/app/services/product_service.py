from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product, ProductClick


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_recommendations(self, tags: list[str], limit: int = 6) -> list[Product]:
        """Match products by tags intersection."""
        if not tags:
            result = await self.db.execute(
                select(Product).where(Product.is_active == True).limit(limit)
            )
            return list(result.scalars().all())

        result = await self.db.execute(select(Product).where(Product.is_active == True))
        all_products = list(result.scalars().all())

        scored = []
        tag_set = set(tags)
        for p in all_products:
            overlap = len(tag_set & set(p.tags))
            if overlap > 0:
                scored.append((overlap, p))
        scored.sort(key=lambda x: -x[0])

        return [p for _, p in scored[:limit]]

    async def get_all_products(self, category: str | None = None, page: int = 1,
                                limit: int = 20) -> tuple[list[Product], int]:
        query = select(Product).where(Product.is_active == True)
        count_query = select(func.count(Product.id)).where(Product.is_active == True)

        if category:
            query = query.where(Product.category == category)
            count_query = count_query.where(Product.category == category)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        products = list(result.scalars().all())
        return products, total

    async def record_click(self, user_id: str, product_id: str, source: str) -> None:
        click = ProductClick(user_id=user_id, product_id=product_id, source=source)
        self.db.add(click)
        await self.db.commit()

    async def extract_tags_from_text(self, text: str) -> list[str]:
        """Extract matching tags from diagnosis text using keyword mapping."""
        keyword_mapping = {
            "皮肤": ["皮肤", "瘙痒", "红肿", "脱毛", "皮炎"],
            "猫癣": ["猫癣", "真菌", "脱毛"],
            "肠胃": ["呕吐", "腹泻", "软便", "食欲不振", "消化"],
            "耳螨": ["耳朵", "耳螨", "甩头", "异味"],
            "肥胖": ["肥胖", "超重", "减肥"],
            "毛球": ["毛球", "呕吐毛球"],
            "寄生虫": ["跳蚤", "蜱虫", "寄生虫"],
            "营养": ["体弱", "术后", "营养不良"],
        }
        matched_tags = set()
        for tag, keywords in keyword_mapping.items():
            for kw in keywords:
                if kw in text:
                    matched_tags.add(tag)
                    break
        return list(matched_tags)
