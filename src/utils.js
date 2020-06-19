import _ from "lodash"
export { cardLabelsRank, sortLabels, compareCardsByLabel, compareCardsByDate, oneWeekAway }

const COLORS = [
  "green", "yellow", "orange", "red", "purple", "blue", "sky", "lime", "pink", "black", "grey"
]

const NOW = new Date();


function cardLabelsRank(c) {
  return _(c.labels).map((l) => _.indexOf(COLORS, l.color)).min()
}

function sortLabels(labels) {
  return _.sortBy(labels, (a) => _.indexOf(COLORS, a.color))
}


function compareCardsByLabel(c1, c2, order) {
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


function compareCardsByDate(a, b, order) {
  return nullSort(a.due, b.due, order)
}


function oneWeekAway(d) {
  return (d.due !== null) && (d.due - NOW < (1000*60*60*24*8))
}
