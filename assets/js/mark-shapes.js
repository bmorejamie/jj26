/* The mark's shape library. The dots always come home to the square, then
   leave for a shape picked at random from this list, never the same one
   twice in a row.

   Adding a shape = adding one entry. Draw it on the 6×6 grid: "#" is a dot,
   "." is empty. Up to 21 dots (the most any shape uses); shapes with fewer
   stack the spares. `dx` / `dy` nudge a shape by a fraction of a cell when
   its dots don't land on whole cells, which keeps it optically centred.
   Shapes can instead give `pts`, a list of [x, y] cells, when they need
   half-cell positions (see play). */
window.JJ_MARK = {
  home: {
    name: "square",
    grid: [
      "......",
      ".####.",
      ".####.",
      ".####.",
      ".####.",
      "......"
    ]
  },
  shapes: [
    {
      name: "cursor",
      grid: [
        ".#....",
        ".##...",
        ".###..",
        ".####.",
        ".##...",
        ".#...."
      ]
    },
    {
      name: "bubble",
      dy: 0.5,
      grid: [
        ".####.",
        "######",
        "######",
        ".####.",
        ".#....",
        "......"
      ]
    },
    {
      name: "play",
      /* Columns of 5-4-3-2-1 dots, each centred on the middle row. */
      pts: [
        [0.5, 0.5], [0.5, 1.5], [0.5, 2.5], [0.5, 3.5], [0.5, 4.5],
        [1.5, 1], [1.5, 2], [1.5, 3], [1.5, 4],
        [2.5, 1.5], [2.5, 2.5], [2.5, 3.5],
        [3.5, 2], [3.5, 3],
        [4.5, 2.5]
      ]
    }
  ]
};
