/* Generated from contracts/tokens/tokens.json by scripts/generate-tokens.mjs. Do not edit. */
export const TOKEN_VERSION = "1.1.0"
export const presetIds = ["vintageLibrary","botanicalGarden","autumnJournal","coffeeAndPaper","oliveVintage","custom"] as const
export type PresetId = (typeof presetIds)[number]
export const presetLabelKeys: Record<PresetId, string> = {"vintageLibrary":"presetVintageLibrary","botanicalGarden":"presetBotanicalGarden","autumnJournal":"presetAutumnJournal","coffeeAndPaper":"presetCoffeeAndPaper","oliveVintage":"presetOliveVintage","custom":"presetCustom"}
export const customPresets: PresetId[] = ["custom"]
export const isCustomPreset = (id: PresetId): boolean => customPresets.includes(id)
export const moduleAccents: Record<string, string> = {"dashboard":"primary","tasks":"primary","habits":"growth","mascot":"growth","gym":"highlight","food":"growth","cardio":"highlight","finance":"primary"}
export const stateRoles: Record<string, string> = {"selected":"primary","hover":"surfaceAlt","focus":"focus","disabled":"disabled"}
export const primitiveColors: Record<string, string> = {"parchment":"#F3EBDD","paper":"#E4D7C1","leather":"#70563B","sage":"#788064","terracotta":"#A36F59","ink":"#3B332B"}
export const fontPreferenceIds = ["vintage","reading","clear"] as const
export type FontPreference = (typeof fontPreferenceIds)[number]
export const fontPreferenceLabelKeys: Record<FontPreference, string> = {"vintage":"fontPreferenceVintage","reading":"fontPreferenceReading","clear":"fontPreferenceClear"}
export const chartPalettes: Record<PresetId, Record<'light' | 'dark', string[]>> = {"vintageLibrary":{"light":["#70563B","#4F5A3C","#8E4F35","#6B5D4D","#A08A5C","#5C6B73"],"dark":["#C9A47F","#98A282","#C08B72","#B6A48D","#D6BE8C","#8FA6B0"]},"botanicalGarden":{"light":["#4F6142","#5A7048","#8A6F3A","#6E7F5E","#A58B4B","#5C7B70"],"dark":["#93AB7C","#9FB786","#C6A96B","#B3C49F","#D6C184","#89ADA3"]},"autumnJournal":{"light":["#8A4B2F","#6B6A3A","#A85D33","#8B6A4A","#B4873F","#6C6152"],"dark":["#C08A63","#A6A566","#D1966B","#B79B7C","#DDBB78","#9C8E7C"]},"coffeeAndPaper":{"light":["#5C4033","#6B7152","#9C6B4A","#7A6B5A","#AF8C5C","#62737A"],"dark":["#B19174","#9DA27E","#C99774","#AC9A83","#D8B985","#8FA6AC"]},"oliveVintage":{"light":["#4F5A38","#5F6E42","#8A7343","#6E7655","#A28B51","#5C7070"],"dark":["#9EAE7D","#A8BA88","#C2AC73","#AFBD94","#D8C68A","#8FA9A5"]},"custom":{"light":["#70563B","#4F5A3C","#8E4F35","#6B5D4D","#A08A5C","#5C6B73"],"dark":["#C9A47F","#98A282","#C08B72","#B6A48D","#D6BE8C","#8FA6B0"]}}
export const typographyScale = {"xs":12,"sm":14,"base":16,"lg":18,"xl":21,"2xl":26,"3xl":32,"4xl":40}
export const typographyFamilies: Record<string, string[]> = {"appTitle":["Cormorant Garamond","Georgia","serif"],"heading":["Libre Baskerville","Georgia","serif"],"section":["Lora","Georgia","serif"],"body":["Nunito Sans","Segoe UI","sans-serif"],"journal":["Cormorant Garamond","Georgia","serif"],"statistics":["Lora","Georgia","serif"]}
export const themeRoles = ["background","surface","surfaceAlt","primary","onPrimary","growth","onGrowth","highlight","onHighlight","text","muted","border","success","warning","danger","disabled","focus","widgetBackground","panel"] as const
export type ThemeRole = (typeof themeRoles)[number]
