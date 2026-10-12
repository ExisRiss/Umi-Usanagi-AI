/* Usanagi Umi feature bridge. */
import { runImportedFeature } from '../../../../lib/imported-compat.js'
const metadata = {"name": "searchgist", "category": "tools", "aliasMap": {"umi-tools-searchgist": "searchgist", "umi-searchgist": "searchgist", "searchgist": "searchgist"}, "description": "Imported from Usanagi Umi MD V4.6", "usage": "", "example": "", "cooldown": 3, "energi": 1}
const handler = (m, extra) => runImportedFeature("umi-core", "plugins/tools/searchgist.js", metadata, m, extra)
handler.help = ["umi-tools-searchgist"]
handler.command = ["umi-tools-searchgist", "umi-searchgist", "searchgist"]
handler.tags = ["tools"]
handler.description = "Imported from Usanagi Umi MD V4.6"
handler.importSource = "umi"
handler.importConfig = {"name": "searchgist", "alias": [], "category": "tools", "description": "Imported from Usanagi Umi MD V4.6", "usage": "", "example": "", "isOwner": false, "isPremium": false, "isGroup": false, "isPrivate": false, "cooldown": 3, "energi": 1, "isEnabled": true}
handler.owner = false
handler.rowner = false
handler.premium = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false
handler.level = 0
handler.limit = 1
handler.importAliasMap = {"umi-tools-searchgist": "searchgist", "umi-searchgist": "searchgist", "searchgist": "searchgist"}
export default handler
