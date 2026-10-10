/**
 * Destaca um item recém-colocado no mural (pin ou display): procura o elemento (ele pode demorar um instante para aparecer depois de salvar),
 * pede ao quadro para trazê-lo à vista se estiver fora da tela e deixa um contorno dourado pulsando por alguns segundos.
 */
export function spotLight(selector: string, scope: ParentNode = document, tries = 34) {
  const find = () =>
    [...scope.querySelectorAll<HTMLElement>(selector)].find((e) => e.getBoundingClientRect().width > 0 && e.offsetParent !== null) ?? null;
  const go = (left: number) => {
    const el = find();
    if (!el) {
      if (left > 0) window.setTimeout(() => go(left - 1), 150);
      return;
    }
    window.dispatchEvent(new CustomEvent("pinz:focus", { detail: el }));
    el.classList.add("pin-spot");
    window.setTimeout(() => el.classList.remove("pin-spot"), 4200);
  };
  go(tries);
}
