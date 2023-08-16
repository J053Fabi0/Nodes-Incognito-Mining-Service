import cheetah from "cheetah";
import { PORT } from "./env.ts";
import router from "./routes/routes.ts";
import auth from "./middlewares/auth.ts";

const app = new cheetah();
app.use(auth());
app.use("/", router);

app.serve({ port: PORT });
