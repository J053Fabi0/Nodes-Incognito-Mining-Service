import { MdSend, MdToday } from "react-icons/md";
import Button, { getButtonClasses } from "../../components/Button.tsx";
import { useSignal } from "@preact/signals";
import MonthSelect from "../../components/MonthSelect.tsx";
import GetInput from "../../components/EditableObject/GetInput.tsx";

export type DateElements = "day" | "month" | "year" | "hours" | "minutes" | "seconds";

interface EditableObjectDateInputProps {
  id: string;
  value: string;
}

export default function GetDateInput({ value, id }: EditableObjectDateInputProps) {
  const dateObj = new Date(+value);

  const day = useSignal(dateObj.getDate());
  const month = useSignal(dateObj.getMonth());
  const year = useSignal(dateObj.getFullYear());
  const hours = useSignal(dateObj.getHours());
  const minutes = useSignal(dateObj.getMinutes());
  const seconds = useSignal(dateObj.getSeconds());

  const dateElements: [DateElements, number][] = [
    ["day", day.value],
    ["month", month.value],
    ["year", year.value],
    ["hours", hours.value],
    ["minutes", minutes.value],
    ["seconds", seconds.value],
  ];

  const timezoneOffset = new Date().getTimezoneOffset() * -1;

  function handleDateToday() {
    const date = new Date();
    day.value = date.getDate();
    month.value = date.getMonth();
    year.value = date.getFullYear();
    hours.value = date.getHours();
    minutes.value = date.getMinutes();
    seconds.value = date.getSeconds();
  }

  return (
    <>
      {dateElements!.map(([key, value]) =>
        key === "month" ? (
          <MonthSelect month={value} id={`${key}&${id}`} class="px-2 w-full bg-white/40 rounded" />
        ) : (
          <GetInput id={`${key}&${id}`} value={value} placeholder={key} />
        )
      )}
      <input type="hidden" name="offset" id="offset&" value={timezoneOffset} />

      {/* Submit button */}
      <Button type="submit" color="green" class="pl-3 pr-[0.6rem]">
        <MdSend size={13} />
      </Button>

      {/* Today button */}
      <div
        class={getButtonClasses("blue", false) + " px-2 flex items-center cursor-pointer"}
        onClick={handleDateToday}
      >
        <MdToday size={13} />
      </div>
    </>
  );
}
