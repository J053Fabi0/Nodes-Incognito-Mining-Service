import { BsCaretLeftFill, BsCaretRightFill } from "react-icons/bs";

const commonClasses = "flex h-9 w-9 items-center justify-center rounded-full p-0 text-sm";

const classes = {
  active: `${commonClasses} bg-pink-500 text-white shadow-md`,
  inactive: `${commonClasses} border border-blue-gray-100 bg-transparent text-blue-gray-500 hover:bg-light-300`,
};

interface PaginationProps {
  /**
   * baseUrl + currentPage = href
   */
  baseUrl: string;
  pages: (number | string)[];
  /**
   * The current page element, not the index
   */
  currentPage: number | string;
  maxPages?: number;
}

export default function Pagination({ baseUrl, pages, currentPage, maxPages = 5 }: PaginationProps) {
  maxPages = Math.max(maxPages % 2 === 0 ? maxPages - 1 : maxPages, 1);

  const indexOfCurrentPage = pages.indexOf(currentPage);

  const pagesForEachSide = Math.floor(maxPages / 2);

  const pagesToTheLeft = pages.slice(Math.max(indexOfCurrentPage - pagesForEachSide, 0), indexOfCurrentPage);
  const pagesToTheRight = pages.slice(indexOfCurrentPage + 1, indexOfCurrentPage + pagesForEachSide + 1);

  // If the pages to the left are less than the pagesForEachSide, add pages to the right to compensate
  if (pagesToTheLeft.length < pagesForEachSide) {
    const end = indexOfCurrentPage + pagesForEachSide + 1 + pagesForEachSide - pagesToTheLeft.length;
    pagesToTheRight.push(
      ...pages.slice(indexOfCurrentPage + pagesForEachSide + 1, end).filter((p) => p !== undefined)
    );
  }

  // If the pages to the right are less than the pagesForEachSide, add pages to the left to compensate
  if (pagesToTheRight.length < pagesForEachSide) {
    const start = Math.max(indexOfCurrentPage - pagesForEachSide * 2 + pagesToTheRight.length, 0);
    pagesToTheLeft.unshift(
      ...pages.slice(start, Math.max(indexOfCurrentPage - pagesForEachSide, 0)).filter((p) => p !== undefined)
    );
  }

  return (
    <nav>
      <div class="flex flex-wrap gap-2 justify-center">
        {/* Previous button */}
        {pagesToTheLeft.length > 0 ? (
          <a
            aria-label="Previous"
            class={classes.inactive}
            href={`${baseUrl}${pagesToTheLeft[pagesToTheLeft.length - 1]}`}
          >
            <BsCaretLeftFill size={16} />
          </a>
        ) : (
          <span class={"invisible " + classes.inactive} />
        )}

        {/* Pages to the left */}
        {pagesToTheLeft.map((page) => (
          <a class={classes.inactive} href={`${baseUrl}${page}`}>
            {page}
          </a>
        ))}

        {/* Current page */}
        <span class={`${classes.active} select-none`}>{currentPage}</span>

        {/* Pages to the right */}
        {pagesToTheRight.map((page) => (
          <a class={classes.inactive} href={`${baseUrl}${page}`}>
            {page}
          </a>
        ))}

        {/* Next button */}
        {pagesToTheRight.length > 0 ? (
          <a aria-label="Next" class={classes.inactive} href={`${baseUrl}${pagesToTheRight[0]}`}>
            <BsCaretRightFill size={16} />
          </a>
        ) : (
          <span class={"invisible " + classes.inactive} />
        )}
      </div>
    </nav>
  );
}
