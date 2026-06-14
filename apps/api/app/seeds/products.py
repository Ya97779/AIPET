from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.points import PointsProduct
from app.models.product import Product


POINTS_PRODUCTS = [
    {"name": "宠物零食试用装", "description": "精选冻干零食小包装", "points_cost": 200, "stock": 100},
    {"name": "逗猫棒", "description": "羽毛铃铛逗猫棒", "points_cost": 300, "stock": 50},
    {"name": "宠物湿粮罐头", "description": "鸡肉配方湿粮罐头", "points_cost": 500, "stock": 30},
    {"name": "Pro会员7天体验", "description": "解锁无限问诊等高级功能", "points_cost": 300, "stock": 999},
    {"name": "宠物毛绒玩具", "description": "可爱造型毛绒玩具", "points_cost": 400, "stock": 50},
]

RECOMMEND_PRODUCTS = [
    {"name": "猫癣药浴液", "description": "抗真菌药浴液，适用于猫癣治疗", "price": "¥89", "category": "medicine", "tags": ["皮肤", "猫癣", "真菌", "脱毛"]},
    {"name": "伊丽莎白圈", "description": "防舔防抓，术后恢复必备", "price": "¥25", "category": "tool", "tags": ["皮肤", "术后", "防舔"]},
    {"name": "宠物益生菌", "description": "调理肠胃，改善消化吸收", "price": "¥59", "category": "medicine", "tags": ["肠胃", "呕吐", "腹泻", "软便"]},
    {"name": "处方粮（肠胃型）", "description": "易消化配方，适合肠胃敏感宠物", "price": "¥128", "category": "food", "tags": ["肠胃", "消化", "处方"]},
    {"name": "皮肤喷剂", "description": "止痒消炎，修复皮肤屏障", "price": "¥45", "category": "medicine", "tags": ["皮肤", "瘙痒", "红肿", "过敏"]},
    {"name": "体外驱虫药", "description": "广谱驱虫，预防跳蚤蜱虫", "price": "¥68", "category": "medicine", "tags": ["寄生虫", "跳蚤", "蜱虫", "瘙痒"]},
    {"name": "减肥处方粮", "description": "低卡高纤，科学减重", "price": "¥138", "category": "food", "tags": ["肥胖", "超重", "减肥"]},
    {"name": "营养膏", "description": "浓缩营养补充，术后体弱适用", "price": "¥39", "category": "food", "tags": ["营养", "体弱", "术后恢复"]},
    {"name": "化毛膏", "description": "润滑肠道，帮助排出毛球", "price": "¥35", "category": "food", "tags": ["毛球", "呕吐毛球"]},
    {"name": "耳螨滴耳液", "description": "杀螨止痒，清洁耳道", "price": "¥42", "category": "medicine", "tags": ["耳朵", "耳螨", "甩头", "异味"]},
]


async def seed_products(db: AsyncSession):
    for item in POINTS_PRODUCTS:
        result = await db.execute(select(PointsProduct).where(PointsProduct.name == item["name"]))
        if result.scalar_one_or_none() is None:
            db.add(PointsProduct(**item))

    for item in RECOMMEND_PRODUCTS:
        result = await db.execute(select(Product).where(Product.name == item["name"]))
        if result.scalar_one_or_none() is None:
            db.add(Product(**item))

    await db.commit()
