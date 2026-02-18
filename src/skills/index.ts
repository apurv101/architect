import { registry } from "./registry";
import { floorPlanSkill } from "./floor-plan";
import { furnitureLayoutSkill } from "./furniture-layout";
import { electricalLayoutSkill } from "./electrical-layout";
import { plumbingLayoutSkill } from "./plumbing-layout";
import { lightingPlanSkill } from "./lighting-plan";
import { hvacLayoutSkill } from "./hvac-layout";
import { multiStorySkill } from "./multi-story";
import { landscapingSkill } from "./landscaping";
import { costEstimatorSkill } from "./cost-estimator";
import { elevationViewSkill } from "./elevation-view";
import { stylePaletteSkill } from "./style-palette";
import { annotationSkill } from "./annotation";

registry.register(floorPlanSkill);
registry.register(furnitureLayoutSkill);
registry.register(electricalLayoutSkill);
registry.register(plumbingLayoutSkill);
registry.register(lightingPlanSkill);
registry.register(hvacLayoutSkill);
registry.register(multiStorySkill);
registry.register(landscapingSkill);
registry.register(costEstimatorSkill);
registry.register(elevationViewSkill);
registry.register(stylePaletteSkill);
registry.register(annotationSkill);

export { registry };
