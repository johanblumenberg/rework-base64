# rework-base64
rework plugin to inline images in css as a base64 encoded data uri

## Usage

```javascript
var gulp = require('gulp');
var rework = require('gulp-rework'),
var base64 = require('rework-base64');

gulp.src('src/styles/**/*.css')
    .pipe(rework(
        base64.base64('dist', {
            maxImageSize: 2048,
            include: [ /^img\// ],

            actOnMissingFile: 'error',
            actOnLargeFile: 'warn',
            actOnEncodedTwice: 'warn'
        })))
    .pipe(gulp.dest('dist'));
```

## API

### Action

Enum that decides what action to take if a problem is detected.

```
enum Action {
  /** Ignore the error and continue */
  IGNORE = '',
  /** Warn about the error and continue */
  WARN = 'warn',
  /** Warn about the error and break */
  ERROR = 'error'
};
```

### base64(dest, options)

#### dest

Base directory where to find images.

#### options

Options that are passed to base64

### Options

#### include

Type: `RegExp[]`

Decides which URLs to encode. Anything that is matched by a regexp in the include array will be converted.

#### exclude

Type: `RegExp[]`

Decides which URLs to encode. Anything that is matched by a regexp in the exclude array will not be converted.

#### maxImageSize

Type: `number`

Only images which are smaller than `maxImageSize` after they are encoded will be inlined.

#### actOnMissingFile

Type: `Action`

Decides what to do if an image file is not found.

#### actOnLargeFile

Type: `Action`

Decides what to do if an image is found that is too big

#### actOnEncodedTwice

Type: `Action`

Decodes what to do if the same image is encoded more than once

