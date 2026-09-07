import { calculatePrescriptionItemProgress } from "@/lib/pharmacy/partial";

describe("calculatePrescriptionItemProgress", () => {
  it("allocates previous dispensing to prescription items in order", () => {
    const result = calculatePrescriptionItemProgress(
      [
        { id: "item-1", medicineId: "med-1", quantity: 10 },
        { id: "item-2", medicineId: "med-1", quantity: 5 },
      ],
      new Map([["med-1", 12]]),
    );

    expect(result).toEqual([
      { id: "item-1", medicineId: "med-1", quantity: 10, alreadyDispensed: 10, remaining: 0 },
      { id: "item-2", medicineId: "med-1", quantity: 5, alreadyDispensed: 2, remaining: 3 },
    ]);
  });

  it("does not apply dispensing for one medicine to a different medicine", () => {
    const result = calculatePrescriptionItemProgress(
      [
        { id: "item-1", medicineId: "med-1", quantity: 10 },
        { id: "item-2", medicineId: "med-2", quantity: 5 },
      ],
      new Map([
        ["med-1", 4],
        ["med-2", 2],
      ]),
    );

    expect(result).toEqual([
      { id: "item-1", medicineId: "med-1", quantity: 10, alreadyDispensed: 4, remaining: 6 },
      { id: "item-2", medicineId: "med-2", quantity: 5, alreadyDispensed: 2, remaining: 3 },
    ]);
  });
});
