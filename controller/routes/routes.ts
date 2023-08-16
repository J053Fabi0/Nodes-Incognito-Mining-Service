import { Collection } from "cheetah";

const router = new Collection();

router.get("/", (c) => void (c.res.code = 200));

export default router;
