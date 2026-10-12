/* Usanagi Umi feature bridge. */
import { runImportedFeature } from '../../../../lib/imported-compat.js'
const metadata = {"name": "ceksexy", "category": "cek", "aliasMap": {"umi-cek-ceksexy": "ceksexy", "umi-ceksexy": "ceksexy", "umi-sexy": "sexy", "umi-hot": "hot", "hot": "hot"}, "description": "Cek seberapa sexy kamu", "usage": ".ceksexy <nama>", "example": ".ceksexy Budi", "cooldown": 5, "energi": 0}
const handler = (m, extra) => runImportedFeature("umi-extra", "plugins/cek/ceksexy.js", metadata, m, extra)
handler.help = ["umi-cek-ceksexy <nama>"]
handler.command = ["umi-cek-ceksexy", "umi-ceksexy", "umi-sexy", "umi-hot", "hot"]
handler.tags = ["cek"]
handler.description = "Cek seberapa sexy kamu"
handler.importSource = "umi"
handler.importConfig = {"name": "ceksexy", "alias": ["sexy", "hot"], "category": "cek", "description": "Cek seberapa sexy kamu", "usage": ".ceksexy <nama>", "example": ".ceksexy Budi", "isOwner": false, "isPremium": false, "isGroup": false, "isPrivate": false, "cooldown": 5, "energi": 0, "isEnabled": true}
handler.owner = false
handler.rowner = false
handler.premium = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false
handler.level = 0
handler.limit = 0
handler.importAliasMap = {"umi-cek-ceksexy": "ceksexy", "umi-ceksexy": "ceksexy", "umi-sexy": "sexy", "umi-hot": "hot", "hot": "hot"}
export default handler
