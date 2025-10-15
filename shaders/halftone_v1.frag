// Author:tsuyi

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;
uniform float u_cellSize;
uniform float u_angleC;
uniform float u_angleM;
uniform float u_angleY;
uniform float u_angleK;

// RGB 轉 CMYK
vec4 rgb2cmyk(vec3 rgb) {
    float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
    float c = (1.0 - rgb.r - k) / (1.0 - k + 1e-6);
    float m = (1.0 - rgb.g - k) / (1.0 - k + 1e-6);
    float y = (1.0 - rgb.b - k) / (1.0 - k + 1e-6);
    return vec4(c, m, y, k);
}

// 旋轉座標
vec2 rotate(vec2 pt, float angleDeg, vec2 center) {
    float rad = radians(angleDeg);
    float s = sin(rad);
    float c = cos(rad);
    pt -= center;
    vec2 rotated = vec2(
        pt.x * c - pt.y * s,
        pt.x * s + pt.y * c
    );
    return rotated + center;
}

// 半調網點計算
float halftoneDot(float channel, vec2 uv, float cellSize, float angle) {
    vec2 center = vec2(0.5, 0.5);
    vec2 rotatedUV = rotate(uv, angle, center);

    vec2 grid = rotatedUV * u_resolution / cellSize;
    vec2 cell = floor(grid) + 0.5;
    vec2 cellCenter = cell * cellSize / u_resolution;

    float dist = length(rotatedUV - cellCenter);
    float radius = (1.0 - channel) * (cellSize / u_resolution.x) * 0.5;
    return dist < radius ? 1.0 : 0.0;
}

void main() {


    // 取得螢幕座標並正規化到 [0,1]
    vec2 st = gl_FragCoord.xy / u_resolution.xy; // 螢幕座標除以解析度，得到正規化座標
    
    // 以 st 作為紋理取樣座標
    vec3 rgb = texture2D(u_tex0, st).rgb; // 取樣原始圖片的 RGB 顏色

    // 將 RGB 轉換為 CMYK 四通道
    vec4 cmyk = rgb2cmyk(rgb); // 取得 C、M、Y、K 四個通道值

    // 計算每個通道的半調網點（各自旋轉角度）
    float dotC = halftoneDot(cmyk.r, st, u_cellSize, u_angleC); // 青色網點
    float dotM = halftoneDot(cmyk.g, st, u_cellSize, u_angleM); // 洋紅色網點
    float dotY = halftoneDot(cmyk.b, st, u_cellSize, u_angleY); // 黃色網點
    float dotK = halftoneDot(cmyk.a, st, u_cellSize, u_angleK); // 黑色網點

    // 定義各通道的顏色
    vec3 cColor = vec3(0.0, 1.0, 1.0); // 青色
    vec3 mColor = vec3(1.0, 0.0, 1.0); // 洋紅色
    vec3 yColor = vec3(1.0, 1.0, 0.0); // 黃色
    vec3 kColor = vec3(0.0, 0.0, 0.0); // 黑色

    // 疊合四個通道的網點顏色，白底
    vec3 result = vec3(1.0); // 初始為白色
    result -= dotC * cColor * cmyk.r; // 疊加青色
    result -= dotM * mColor * cmyk.g; // 疊加洋紅色
    result -= dotY * yColor * cmyk.b; // 疊加黃色
    result -= dotK * kColor * cmyk.a; // 疊加黑色

    // DEBUG: 如果完全看不到任何東西，先註解下面這行來測試 shader 是否正在運作
    //result = vec3(1.0, 0.0, 0.0); // 純紅色測試
    
    result = clamp(result, 0.0, 1.0); // 限制顏色在合法範圍
    gl_FragColor = vec4(result, 1.0); // 輸出最終顏色
}