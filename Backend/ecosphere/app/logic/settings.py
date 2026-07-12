from app.models import SettingConfig

DEFAULTS = {
    "auto_emission_calc": "true",
    "evidence_requirement": "true",
    "badge_auto_award": "true",
}


async def get_setting(key: str) -> bool:
    row = await SettingConfig.find_one(SettingConfig.key == key)
    if row is None:
        return DEFAULTS.get(key, "false") == "true"
    return row.value == "true"


async def set_setting(key: str, value: bool):
    row = await SettingConfig.find_one(SettingConfig.key == key)
    if row is None:
        row = SettingConfig(key=key, value="true" if value else "false")
        await row.insert()
    else:
        row.value = "true" if value else "false"
        await row.save()


async def ensure_defaults():
    for k, v in DEFAULTS.items():
        existing = await SettingConfig.find_one(SettingConfig.key == k)
        if existing is None:
            await SettingConfig(key=k, value=v).insert()
