import { useSignal } from "@preact/signals";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BsFillCartCheckFill } from "react-icons/bs";
import Node from "../types/collections/node.type.ts";
import PingCircle from "../components/PingCircle.tsx";
import Button, { getButtonClasses } from "../components/Button.tsx";
import Typography, { getTypographyClass } from "../components/Typography.tsx";

const styles = {
  label: `whitespace-nowrap flex items-center gap-2 ${getTypographyClass("p")}`,
};

interface NewConfirmNodeSelectorProps {
  validatorRegex: string;
  validatorPublicRegex: string;
  validatorError: string | undefined;
  validatorPublicError: string | undefined;
  defaultValidator: string;
  defaultValidatorPublic: string;
  inactiveNodes: Pick<Node, "number" | "validatorPublic" | "validator">[];
}

export default function NewConfirmNodeSelector({
  inactiveNodes,
  validatorRegex,
  validatorPublicRegex,
  validatorError,
  validatorPublicError,
  defaultValidator,
  defaultValidatorPublic,
}: NewConfirmNodeSelectorProps) {
  const validator = useSignal<string>(defaultValidator);
  const validatorPublic = useSignal<string>(defaultValidatorPublic);

  const handleExistingNode = (v: string, vp: string) => () => {
    validator.value = v;
    validatorPublic.value = vp;
  };

  return (
    <>
      {inactiveNodes.length > 0 && (
        <div class="flex flex-wrap items-center gap-2 mt-5">
          <PingCircle color="pink" class="ml-2 mr-1" />

          <Typography>Your inactive nodes:</Typography>

          {inactiveNodes.map((n, i) => (
            <Button color={i % 2 ? "blue" : "green"} onClick={handleExistingNode(n.validator, n.validatorPublic)}>
              {n.number}
            </Button>
          ))}
        </div>
      )}

      <form method="POST" class="mt-3">
        <div class="flex flex-col gap-3">
          <div>
            <label for="validator" class={styles.label}>
              Validator key
              <AiOutlineInfoCircle class="hidden sm:block" title="Used to initialize the node" size={18} />
              <span class="block sm:hidden">(used to initialize the node)</span>
            </label>

            <input
              required
              type="text"
              id="validator"
              name="validator"
              value={validator.value}
              pattern={validatorRegex}
              class="p-2 border border-gray-300 rounded w-full"
            />

            {validatorError && (
              <Typography variant="p" class="mt-1 text-red-600 break-words">
                {validatorError}
              </Typography>
            )}
          </div>

          <div>
            <label for="validatorPublic" class={styles.label}>
              Validator public key
              <AiOutlineInfoCircle class="hidden sm:block" title="Used to check the node status" size={18} />
              <span class="block sm:hidden">(used to check the node status)</span>
            </label>

            <input
              required
              type="text"
              id="validatorPublic"
              name="validatorPublic"
              value={validatorPublic.value}
              class="p-2 border border-gray-300 rounded w-full"
              pattern={validatorPublicRegex}
            />
          </div>

          {validatorPublicError && (
            <Typography variant="p" class="mt-1 text-red-600 break-words">
              {validatorPublicError}
            </Typography>
          )}
        </div>

        <div class="flex items-end justify-center gap-5 mt-3">
          <Button type="submit" color="green" class="mt-3 !normal-case">
            <Typography variant="h4" class="flex items-center gap-2">
              Confirm
              <BsFillCartCheckFill size={20} />
            </Typography>
          </Button>

          <a class={`${getButtonClasses("red", false)} mt-3 py-1 px-2`} href="/me/balance">
            <Typography variant="p" class="!normal-case h-min py-0">
              Cancel, get refund
            </Typography>
          </a>
        </div>
      </form>
    </>
  );
}
