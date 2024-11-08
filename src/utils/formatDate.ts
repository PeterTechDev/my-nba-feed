export const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-");
  const formattedDate = new Date(+year, +month - 1, +day).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
  return formattedDate;
};
