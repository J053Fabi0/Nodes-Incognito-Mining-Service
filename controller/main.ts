import cheetah from "cheetah";
import { PORT } from "./env.ts";
import auth from "./middlewares/auth.ts";
import shardRoutes from "./routes/shard.ts";

const app = new cheetah();

app.use(auth());
app.get("/", (c) => void (c.res.code = 200));
app.use("/", shardRoutes);

app.serve({ port: PORT });
