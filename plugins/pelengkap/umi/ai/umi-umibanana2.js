/* Usanagi Umi feature bridge. */
import { runImportedFeature } from '../../../../lib/imported-compat.js'
const metadata = {"name": "umibanana2", "category": "ai", "aliasMap": {"umi-ai-umibanana2": "umibanana2", "umi-umibanana2": "umibanana2", "umibanana2": "umibanana2"}, "description": "Buat gambar dengan AI menggunakan prompt", "usage": ".umibanana2 <prompt>", "example": ".umibanana2 make it anime style", "cooldown": 30, "energi": 1}
const handler = (m, extra) => runImportedFeature("umi-core", "plugins/ai/umibanana2.js", metadata, m, extra)
handler.help = ["umi-ai-umibanana2 <prompt>"]
handler.command = ["umi-ai-umibanana2", "umi-umibanana2", "umibanana2"]
handler.tags = ["ai"]
handler.description = "Buat gambar dengan AI menggunakan prompt"
handler.importSource = "umi"
handler.importConfig = {"name": "umibanana2", "alias": [], "category": "ai", "description": "Buat gambar dengan AI menggunakan prompt", "usage": ".umibanana2 <prompt>", "example": ".umibanana2 make it anime style", "isOwner": false, "isPremium": false, "isGroup": false, "isPrivate": false, "cooldown": 30, "energi": 1, "isEnabled": true}
handler.owner = false
handler.rowner = false
handler.premium = false
handler.group = false
handler.private = false
handler.admin = false
handler.botAdmin = false
handler.level = 0
handler.limit = 1
handler.importAliasMap = {"umi-ai-umibanana2": "umibanana2", "umi-umibanana2": "umibanana2", "umibanana2": "umibanana2"}
export default handler
