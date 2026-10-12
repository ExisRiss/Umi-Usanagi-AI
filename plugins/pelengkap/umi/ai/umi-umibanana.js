/* Usanagi Umi feature bridge. */
import { runImportedFeature } from '../../../../lib/imported-compat.js'
const metadata = {"name": "umibanana", "category": "ai", "aliasMap": {"umi-ai-umibanana": "umibanana", "umi-umibanana": "umibanana", "umibanana": "umibanana"}, "description": "Edit gambar dengan AI menggunakan prompt", "usage": ".umibanana <prompt>", "example": ".umibanana make it anime style", "cooldown": 30, "energi": 1}
const handler = (m, extra) => runImportedFeature("umi-core", "plugins/ai/umibanana.js", metadata, m, extra)
handler.help = ["umi-ai-umibanana <prompt>"]
handler.command = ["umi-ai-umibanana", "umi-umibanana", "umibanana"]
handler.tags = ["ai"]
handler.description = "Edit gambar dengan AI menggunakan prompt"
handler.importSource = "umi"
handler.importConfig = {"name": "umibanana", "alias": [], "category": "ai", "description": "Edit gambar dengan AI menggunakan prompt", "usage": ".umibanana <prompt>", "example": ".umibanana make it anime style", "isOwner": false, "isPremium": false, "isGroup": false, "isPrivate": false, "cooldown": 30, "energi": 1, "isEnabled": true}
handler.owner = false
handler.rowner = false
handler.premium = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false
handler.level = 0
handler.limit = 1
handler.importAliasMap = {"umi-ai-umibanana": "umibanana", "umi-umibanana": "umibanana", "umibanana": "umibanana"}
export default handler
