import { Checklist } from "./types";

export const SEED_CHECKLISTS: Checklist[] = [
  {
    id: "seed-work",
    name: "出勤",
    items: [
      { id: "sw-1", label: "スマホ", checked: false },
      { id: "sw-2", label: "財布", checked: false },
      { id: "sw-3", label: "名札・社員証", checked: false },
      { id: "sw-4", label: "PC・充電器", checked: false },
      { id: "sw-5", label: "お弁当", checked: false },
      { id: "sw-6", label: "マスク", checked: false },
      { id: "sw-7", label: "ハンカチ・ティッシュ", checked: false },
    ],
  },
  {
    id: "seed-private",
    name: "お出かけ",
    items: [
      { id: "sp-1", label: "スマホ", checked: false },
      { id: "sp-2", label: "財布", checked: false },
      { id: "sp-3", label: "モバイルバッテリー", checked: false },
      { id: "sp-4", label: "折りたたみ傘", checked: false },
      { id: "sp-5", label: "ティッシュ・ハンカチ", checked: false },
    ],
  },
  {
    id: "seed-gym",
    name: "ジム",
    items: [
      { id: "sg-1", label: "着替え", checked: false },
      { id: "sg-2", label: "シューズ", checked: false },
      { id: "sg-3", label: "タオル", checked: false },
      { id: "sg-4", label: "水筒", checked: false },
      { id: "sg-5", label: "ジム会員証", checked: false },
    ],
  },
];
