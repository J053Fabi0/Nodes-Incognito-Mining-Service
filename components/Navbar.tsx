import Button from "./Button.tsx";
import { asset } from "$fresh/runtime.ts";
import Typography from "./Typography.tsx";

interface Page {
  name: string;
  href: string;
  onlyLoggedIn?: true;
  onlyLoggedOut?: true;
  onlyAdmin?: true;
}

const pages: Page[] = [
  {
    name: "My nodes",
    href: "/nodes",
    onlyLoggedIn: true,
  },
  {
    name: "Monitor",
    href: "/nodes/monitor",
    onlyLoggedIn: true,
  },
  {
    name: "New node",
    href: "/nodes/new",
    onlyLoggedIn: true,
  },
  {
    name: "Account",
    href: "/me",
    onlyLoggedIn: true,
  },
  {
    name: "Admin",
    href: "/admin",
    onlyAdmin: true,
  },
];

export default function Navbar({ loggedIn = false, isAdmin = false }) {
  const signInOrOut = loggedIn ? (
    <a href="/signout">
      <Button color="red">
        <span>Sign out</span>
      </Button>
    </a>
  ) : (
    <a href="/signin">
      <Button color="green">
        <span>Sign in</span>
      </Button>
    </a>
  );

  const pagesElement = pages.length > 0 && (
    <ul class="lg:items-center gap-3 lg:gap-6 flex flex-col lg:flex-row">
      {pages
        .filter((p) => {
          if (p.onlyAdmin) return isAdmin;
          if (p.onlyLoggedIn) return loggedIn;
          if (p.onlyLoggedOut) return !loggedIn;
          return true;
        })
        .map((page) => (
          <li class="block font-sans text-md font-normal leading-normal text-inherit antialiased hover:underline">
            <a class="flex items-center" href={page.href}>
              {page.name}
            </a>
          </li>
        ))}
    </ul>
  );

  return (
    <nav class="bg-gray-300">
      <div class="mx-auto block w-full max-w-screen-lg py-2 px-4 lg:py-3">
        <div class="container mx-auto flex items-center justify-between text-gray-900">
          <a href="/">
            <Typography variant="h5" class="mr-4 cursor-pointer">
              Nodes - Hosting service
            </Typography>
          </a>

          <div class="hidden lg:inline-block">{pagesElement}</div>

          <div class="hidden lg:inline-block">{signInOrOut}</div>

          <button
            class="middle none relative ml-auto h-6 max-h-[40px] w-6 max-w-[40px] rounded-lg text-center font-sans text-xs font-medium uppercase text-blue-gray-500 transition-all hover:bg-transparent focus:bg-transparent active:bg-transparent disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none lg:hidden"
            data-collapse-target="navbar"
          >
            <span class="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </span>
          </button>
        </div>

        <div
          class="block h-0 w-full basis-full overflow-hidden text-blue-gray-900 transition-all duration-300 ease-in lg:hidden"
          data-collapse="navbar"
        >
          <div class="container mx-auto pb-2 pt-5 flex items-start flex-col w-full">
            {pagesElement}
            <hr class="my-5 border-gray-400 w-full" />
            <div class="self-end">{signInOrOut}</div>
          </div>
        </div>
      </div>

      <script src={asset("/scripts/collapse.js")}></script>
    </nav>
  );
}
