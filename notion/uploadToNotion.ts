import addItem from "./addItem.ts";
import getTableID from "./getTableID.ts";
import createTable from "./createTable.ts";
import nameOfMonth from "../utils/nameOfMonth.ts";
import updateTablesName from "./updateTablesName.ts";
import getTableTotalEarnings from "./getTableTotalEarnings.ts";
import { prvDecimalsDivisor } from "../constants.ts";

/**
 * It creates the database if it doesn't exist. It also updates its title.
 */
const uploadToNotion = async (
  page_id: string,
  epoch: string | number,
  date: Date = new Date(),
  earnings: number,
  node: number
) => {
  let database_id = await getTableID(page_id, date);
  if (!database_id) {
    const nameOfTable = `${nameOfMonth(date)} ${date.getFullYear()}`;
    database_id = await createTable(page_id, nameOfTable);
  }

  await addItem(database_id, epoch, date, earnings, node);

  const totalEarnings = await getTableTotalEarnings(database_id);
  updateTablesName(
    database_id,
    `${nameOfMonth(date)} ${date.getFullYear()} - ` +
      parseInt(totalEarnings * prvDecimalsDivisor + "") / prvDecimalsDivisor
  );
};

export default uploadToNotion;
