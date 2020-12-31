import { Options, toast } from 'bulma-toast'

// ref: https://github.com/rfoel/bulma-toast
export default class Toast {
  public static success(message: string): void {
    toast({
      ...this.commonOptions(),
      message: this.createIconMessage(message, 'check-circle'),
      type: 'is-success',
    })
  }

  public static error(message: string): void {
    toast({
      ...this.commonOptions(),
      message: this.createIconMessage(message, 'alert'),
      type: 'is-danger',
    })
  }

  ///

  protected static commonOptions(): Options {
    return {
      duration: 5000,
      position: 'top-right',
      dismissible: true,
      pauseOnHover: true,
      animate: { in: 'fadeInRight', out: 'fadeOutRight' },
    }
  }

  protected static createIconMessage(message: string, icon?: string) {
    const span = icon
      ? `<span class="icon"><i class="mdi mdi-${icon}"></i></span>`
      : ''
    return `<p>${span}${message}</p>`
  }
}
