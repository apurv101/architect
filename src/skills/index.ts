import { registry } from "./registry";
import { floorPlanSkill } from "./floor-plan";
import { reviewSkill } from "./review";

registry.register(floorPlanSkill);
registry.register(reviewSkill);

export { registry };
