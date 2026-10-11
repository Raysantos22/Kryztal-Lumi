// Remember (for this browser tab only) which phone placed an order, so the
// "order placed" page can reload it after a refresh without asking again.
export function rememberOrder(orderNo, phone) {
  try {
    sessionStorage.setItem(`kl-order:${orderNo}`, phone)
  } catch {
    /* storage blocked */
  }
}

export function recallOrderPhone(orderNo) {
  try {
    return sessionStorage.getItem(`kl-order:${orderNo}`)
  } catch {
    return null
  }
}
