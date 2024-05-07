document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_OPTION = {
        w: 400,
        h: 400,
        accept_pattern: `image/*`,
        output_format: `png`,
        output_quality: null,
    };

    const OUTPUT_FORMAT_LIST = [`png`, `jpeg`, `webp`];

    const MESSAGE = {
        image_load_error: `ご選択されたファイルの画像形式は対応しておりません。`,
        accept_pattern_error: `ご選択されたファイルの形式は対応しておりません。`,
    };

    const $codeWrapper = document.querySelectorAll('input[type=file][data-resize]');

    let resize_file_list = {};

    // 入力画像canvas取得
    const get_resize_canvas = ($item, is_create, $insertBefore) => {
        const id = 'resize_canvas_' + $item.name;
        let $element = document.getElementById(id);

        if (!$element && is_create) {
            // なければ作成
            $element = document.createElement('canvas');
            $element.id = id;
            $element.classList.add('resize_canvas');
            $insertBefore.parentNode.insertBefore($element, $insertBefore.nextSibling);
        }

        return $element;
    };

    // base64データ用input取得
    const get_resize_base64 = ($item, is_create, $insertBefore) => {
        const id = 'resize_base64_' + $item.name;
        let $element = document.getElementById(id);

        if (!$element && is_create) {
            // なければ作成
            $element = document.createElement('input');
            $element.id = id;
            $element.classList.add('resize_base64');
            $insertBefore.parentNode.insertBefore($element, $insertBefore.nextSibling);
        }

        return $element;
    };

    // 出力画像img取得
    const get_resize_output_img = ($item, is_create, $insertBefore) => {
        const id = 'resize_output_img_' + $item.name;
        let $element = document.getElementById(id);

        if (!$element && is_create) {
            // なければ作成
            $element = document.createElement('img');
            $element.id = id;
            $element.classList.add('resize_output_img');
            $insertBefore.parentNode.insertBefore($element, $insertBefore.nextSibling);
        }

        return $element;
    };

    // 画像リサイズ用要素削除
    const remove_resize_element = ($item) => {
        const $resize_canvas = get_resize_canvas($item, false, $item);
        const $resize_output_img = get_resize_output_img($item, false, $item);

        if ($resize_canvas) {
            $resize_canvas.remove();
        }
        if ($resize_output_img) {
            $resize_output_img.remove();
        }
    };

    const is_safari = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();

        if (userAgent.indexOf('safari') !== -1 && userAgent.indexOf('chrome') === -1 && userAgent.indexOf('edge') === -1) {
            return true;
        }

        return false;
    };

    // オプション取得
    const get_option = ($item) => {
        let option = {};
        let data = $item.dataset.resize;

        if (data) {
            try {
                data = data.replace(/'/g, '"');
                option = JSON.parse(data);

                if (option.output_format) {
                    if (!OUTPUT_FORMAT_LIST.includes(option.output_format)) {
                        delete option.output_format;
                    } else if (is_safari() && 'webp' === option.output_format) {
                        delete option.output_format;
                    }
                }

                option = { ...DEFAULT_OPTION, ...option };
            } catch (error) {
                console.error('get_option', error);
                option = DEFAULT_OPTION;
            }
        } else {
            option = DEFAULT_OPTION;
        }

        console.log('option', $item.name, option);

        return option;
    };

    // リサイズ縦横取得
    const get_resize_size = (image, option) => {
        let width = image.width;
        let height = image.height;
        let ratio = width / height;

        if (width > option.w) {
            width = option.w;
            height = option.w / ratio;
        }

        if (height > option.h) {
            width = option.h * ratio;
            height = option.h;
        }

        return { w: width, h: height };
    };

    // 画像リサイズ
    const resize_image = async ($item) => {
        $item.disabled = true;

        let imageFile = $item.files[0];
        let option = get_option($item);

        // ファイルチェック
        const re = new RegExp(option.accept_pattern, 'ig');
        const result = re.test(imageFile.type);
        if (false === result) {
            alert(MESSAGE.accept_pattern_error);
            $item.value = '';
            remove_resize_element($item);
            $item.disabled = false;
            return;
        }

        const image = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            image.onload = () => {
                const resize_size = get_resize_size(image, option);

                const $resize_canvas = get_resize_canvas($item, true, $item);
                const $resize_output_img = get_resize_output_img($item, true, $resize_canvas);

                $resize_canvas.setAttribute('width', resize_size.w);
                $resize_canvas.setAttribute('height', resize_size.h);

                $resize_output_img.setAttribute('width', resize_size.w);
                $resize_output_img.setAttribute('height', resize_size.h);

                const ctx = $resize_canvas.getContext('2d');

                ctx.clearRect(0, 0, resize_size.w, resize_size.h);
                ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, resize_size.w, resize_size.h);

                let base64 = '';
                if (null === option.output_quality) {
                    base64 = $resize_canvas.toDataURL(`image/${option.output_format}`);
                } else {
                    base64 = $resize_canvas.toDataURL(`image/${option.output_format}`, option.output_quality);
                }

                console.log('base64 size', $item.name, base64.length);

                // base64からBlobデータを作成
                const bin = atob(base64.split('base64,')[1]);
                const bin_len = bin.length;
                const buffer = new Uint8Array(bin_len);
                let i = 0;
                while (i < bin_len) {
                    buffer[i] = bin.charCodeAt(i);
                    i++;
                }
                const blob = new Blob([buffer], { type: `image/${option.output_format}` });

                console.log('blob', $item.name, blob);

                $resize_output_img.src = URL.createObjectURL(blob);

                resize_file_list[$item.name] = {
                    input_file_name: imageFile.name,
                    output_file_name: imageFile.name.split('.').slice(0, -1).join('.') + '.' + option.output_format,
                    base64: base64,
                    blob: blob,
                };

                console.log('resize_file_list', resize_file_list);

                $item.disabled = false;
            };

            image.onerror = (e) => {
                console.error('image load', e);
                alert(MESSAGE.image_load_error);
                $item.disabled = false;
            };

            image.src = e.target.result;
        };

        // heif/heic対応
        if (!is_safari() && (imageFile.type === 'image/heif' || imageFile.type === 'image/heic')) {
            const outputBlob = await heic2any({
                blob: imageFile,
                toType: 'image/jpeg',
                quality: 1,
            });

            if (!Array.isArray(outputBlob)) {
                reader.readAsDataURL(outputBlob);
            }
        } else {
            reader.readAsDataURL(imageFile);
        }
    };

    $codeWrapper.forEach(($item) => {
        $item.addEventListener('click', (e) => {
            resize_file_list[e.target.name] = {
                input_file_name: null,
                output_file_name: null,
                base64: null,
                blob: null,
            };
            e.target.value = '';
            remove_resize_element(e.target);
        });

        $item.addEventListener('change', (e) => {
            resize_image(e.target);
        });
    });
});
