import { type Options, toast } from 'bulma-toast'

// ref: https://github.com/rfoel/bulma-toast
export default class Toast {
  public static success(message: string): void {
    this.show(message, 'check-circle', 'is-success')
  }

  public static warn(message: string): void {
    this.show(message, 'alert', 'is-warning')
  }

  public static error(message: string): void {
    this.show(message, 'alert', 'is-danger')
  }

  ///

  protected static show(message: string, icon: string, type: Options['type']): void {
    toast({
      message: `<p><span class="icon"><i class="mdi mdi-${icon}"></i></span>${escapeHtml(message)}</p>`,
      type,
      duration: 5000,
      position: 'top-right',
      dismissible: true,
      pauseOnHover: true,
      animate: { in: 'fadeInRight', out: 'fadeOutRight' },
    })
  }
}

/** toast は innerHTML で描画されるため、メッセージ (ファイル名など) はエスケープする. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}
