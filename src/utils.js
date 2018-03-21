import _ from "lodash"
export { cardLabelsRank, labelsSort, nullSort, dateSort, oneWeekAway }

const COLORS = [
  "red", "orange", "yellow", "green", "blue", "purple", "sky", "lime", "black"
]

const NOW = new Date();


function cardLabelsRank(c) {
  return _(c.labels).map((l) => _.indexOf(COLORS, l.color)).min()
}


function labelsSort(c1, c2, order) {
  const comp = cardLabelsRank(c1) - cardLabelsRank(c2)
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


function oneWeekAway(d) {
  return (d.due !== null) && (d.due - NOW < (1000*60*60*24*8))
}
