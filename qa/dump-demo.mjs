import { writeFileSync } from "node:fs";
import { makeSeed } from "../src/data/seed.js";

const db = makeSeed();
writeFileSync(new URL("./demo-data.json", import.meta.url), JSON.stringify(db));
console.log("OK v" + db.version + " events:" + db.events.length + " ingredients:" + db.ingredients.length + " recipes:" + db.recipes.length + " dishes:" + db.dishes.length + " menus:" + db.menus.length + " clients:" + db.clients.length);
