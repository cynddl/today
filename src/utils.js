import _ from "lodash"
export { compare_labels, labelsSort, nullSort, dateSort, magicSort }


function compare_labels(c) {
  const COLORS = ["black", "red", "orange", "yellow", "green", "blue", "purple", "sky", "lime"]
  var ix_labels = _.map(c.labels, l => _.indexOf(COLORS, l.color))
  return Math.max(_.min(ix_labels), -1)
}


function labelsSort(c1, c2, order) {
  const comp = compare_labels(c1) - compare_labels(c2)
  return order === "desc" ? comp : -comp
}


function nullSort(a, b, order) {
  if (order === "desc") {
    return (a === null) - (b === null) || +(a > b) || -(a < b)
  } else {
    return (a === null) - (b === null) || -(a > b) || +(a < b)
  }
}


function dateSort(a, b, order) {
  return nullSort(a.due, b.due, order)
}


/* Sort cards first by due date (if less than a week), then by priority */
function magicSort(a, b) {
  const now = new Date();
  const one_week_away = (d) => (d !== null) && (d - now < (1000*60*60*24*7));

  if (one_week_away(a.due) || one_week_away(b.due))
    return nullSort(a.due, b.due, "desc")
  else
    return labelsSort(a, b, "desc")
}
