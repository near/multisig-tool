export default function findByAttr(component: any, attr: string): any {
  return component.find(`[data-test="${attr}"]`);
}
