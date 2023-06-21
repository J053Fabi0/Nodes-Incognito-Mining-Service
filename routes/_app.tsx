import { Head } from "$fresh/runtime.ts";
import { IoIosMail } from "react-icons/io";
import { AppProps } from "$fresh/server.ts";
import Navbar from "../components/Navbar.tsx";
import { Links } from "../components/Links.tsx";
import Typography from "../components/Typography.tsx";
import { isAdminPage } from "../utils/isAdminPage.tsx";
import { BsTelegram, BsFillCircleFill } from "react-icons/bs";

export default function App({ Component, data, url }: AppProps) {
  const isAdmin = (data || {}).isAdmin ?? isAdminPage(url.href);

  return (
    <>
      <Head>
        <Links />
      </Head>

      <body class="min-h-screen flex flex-col">
        <Navbar loggedIn={isAdmin} />

        <div class="px-4 pt-4 mx-auto w-full max-w-screen-lg flex-1">
          <Component />
        </div>

        {/* Bottom bar */}
        <div class="mt-6 py-5 bg-gray-300 text-slate-600">
          <div class="px-4 mx-auto w-full max-w-screen-lg flex items-center gap-2">
            <Typography>Contact:</Typography>
            <a href="https://t.me/senorbinario" target="_blank" title="Telegram">
              <BsTelegram class="cursor-pointer" />
            </a>
            <a href="mailto:jf@josefabio.com" target="_blank" title="Email">
              <IoIosMail size={20} class="cursor-pointer" />
            </a>
            <a href="https://we.incognito.org/u/J053/summary" target="_blank" title="Incognito Forum">
              <BsFillCircleFill size={16} class="cursor-pointer" />
            </a>
          </div>
        </div>
      </body>
    </>
  );
}
