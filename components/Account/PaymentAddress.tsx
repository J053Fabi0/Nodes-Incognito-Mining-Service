import Typography from "../Typography.tsx";

interface PaymentAddressProps {
  paymentAddress: string;
  paymentAddressImage: string;
}

export default function PaymentAddress({ paymentAddress, paymentAddressImage }: PaymentAddressProps) {
  return (
    <>
      <div class="flex flex-col items-center sm:items-start sm:flex-row gap-3">
        <div class="grid">
          <div>
            <Typography variant="h4" class="mb-1 h-min">
              Deposit
            </Typography>
            <Typography variant="p" class="mb-3">
              This address is unique to your account and will never change. You can save it for future use.
            </Typography>
          </div>
          <div class="overflow-x-auto h-min">
            <Typography variant="lead" class="mb-3 w-min">
              <code>{paymentAddress}</code>
            </Typography>
          </div>
        </div>

        <img
          src={paymentAddressImage}
          alt="Payment address"
          width={200}
          height={200}
          class="max-w-[200px] max-h-[200px]"
        />
      </div>
    </>
  );
}
