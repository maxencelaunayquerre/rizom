// For date formating see : https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#options

export const getAppropriateDateFormat = (baseDate, dateToFormat) => {
 
  if(dateToFormat.toDateString() == baseDate.toDateString()) {
    return TodayFormat.format(dateToFormat);
  } else if (dateToFormat.getFullYear() == baseDate.getFullYear()) {
    return ThisYearFormat.format(dateToFormat);
  } else {
    return DefaultDateFormat.format(dateToFormat);
  }

}

export const TodayFormat = new Intl.DateTimeFormat('en-US', {
    hour: "2-digit", minute: "2-digit"
});
export const ThisYearFormat = new Intl.DateTimeFormat('en-US', {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
});
export const DefaultDateFormat = new Intl.DateTimeFormat('en-US', {
    year: "numeric", weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
});