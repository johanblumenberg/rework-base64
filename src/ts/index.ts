import * as path from 'path';
import * as fs from 'fs';

const Datauri = require('datauri');
const func = require('rework-plugin-function');

const NAME = 'rework-base64';

/**
 *  Enum that decides what action to take if a problem is detected.
 */
export enum Action {
    /** Ignore the error and continue */
    IGNORE = '',
    /** Warn about the error and continue */
    WARN = 'warn',
    /** Warn about the error and break */
    ERROR = 'error'
};

/**
 * Options that are passed to base64
 */
export interface Options {
    /** Decides which URLs to encode. Anything that is matched by a regexp in the include array will be converted  */
    include: RegExp[];
    /** Decides which URLs to encode. Anything that is matched by a regexp in the exclude array will not be converted */
    exclude: RegExp[];
    /** Only images which are smaller than `maxImageSize` after they are encoded will be inlined */
    maxImageSize: number;
    /** Maximum number of warnings that should be reported */
    maxReported: number;

    /** Decides what to do if an image file is not found */
    actOnMissingFile: Action;
    /** Decides what to do if an image is found that is too big */
    actOnLargeFile: Action;
    /** Decodes what to do if the same image is encoded more than once */
    actOnEncodedTwice: Action;

    /** If set to true, include the original URL as a comment */
    originalAsComment: boolean;
};

export function base64(baseDir: string, options: Partial<Options>) {
    var opts: Options = Object.assign({
        include: [] as string[],
        exclude: [ /.*/ ],
        maxImageSize: 8192,
        maxReported: 10,

        actOnMissingFile: Action.ERROR,
        actOnLargeFile: Action.WARN,
        actOnEncodedTwice: Action.WARN,
        originalAsComment: false
    }, options);

    let cache: { [url: string]: string } = {};
    let reported = 0;
    let errors = 0;
    let warnings = 0;
    let wasted = 0;

    function error(value: string | undefined, action: Action, url: string, msg: string) {
        msg = 'Image file ' + url + ' ' + msg;

        if (action === Action.ERROR) {
            errors++;
            console.error(msg);
        } else if (action === Action.WARN) {
            warnings++;
            if (reported++ < opts.maxReported) {
                console.warn(msg);
            }
        }
        return value;
    }

    function url(fn: (url: string) => string | undefined) {
        return func({
            url: function(path: string){
                path = path.split('"').join('');
                path = path.split('\'').join('');

                let oldValue = path.trim();
                let newValue = fn.call(this, oldValue);

                if (!newValue) {
                    return 'url("' + oldValue + '")';
                } else if (opts.originalAsComment) {
                    return '/*' + oldValue + '*/ url("' + newValue + '")';
                } else {
                    return 'url("' + newValue + '")';
                }
            }
        }, false);
    }
    
    function matches(url: string): boolean {
        return !url.startsWith('data:') &&
            (opts.include.some(re => !!url.match(re)) || !opts.exclude.some(re => !!url.match(re)));
    }

    function base64(url: string) {
        if (matches(url)) {
            if (cache[url]) {
                wasted += cache[url].length;
                return error(cache[url], opts.actOnEncodedTwice, url, "is encoded more than once")
            } else {
                let file = path.resolve(baseDir, url);

                if (fs.existsSync(file)) {
                    let data = new Datauri(file);

                    if (data.content.length < opts.maxImageSize) {
                        return cache[url] = data.content;
                    } else {
                        return error(undefined, opts.actOnLargeFile, url, 'is too large');
                    }
                } else {
                    return error(undefined, opts.actOnMissingFile, url, 'is missing');
                }
            }
        } else {
            return undefined;
        }
    }

    return function(this: any) {
        let ret = url(base64).apply(this, arguments);

        if (warnings > 0 && errors > 0) {
            console.log(`${NAME}: There were ${errors} errors and ${warnings} warnings`);
        } else if (errors > 0) {
            console.log(`${NAME}: There were ${errors} errors`);
        } else if (warnings > 0) {
            console.log(`${NAME}: There were ${warnings} warnings`);
        }

        if (wasted > 0) {
            console.log(`${NAME}: Duplicate images are using ${wasted} bytes`)
        }

        if (errors > 0) {
            throw new Error('There were errors, see the log');
        } else {
            return ret;
        }
    }
}
