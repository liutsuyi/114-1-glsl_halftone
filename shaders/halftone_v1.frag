#version 330 core
// Author:tsuyi

uniform sampler2D u_image;      // 輸入圖片
uniform vec2 u_resolution;      // 輸出解析度
uniform float u_cellSize;       // 網點大小
uniform float u_angleC;         // C 通道旋轉角度（度）
uniform float u_angleM;         // M 通道旋轉角度（度）
uniform float u_angleY;         // Y 通道旋轉角度（度）
uniform float u_angleK;         // K 通道旋轉角度（度）

in vec2 v_texCoord;
out vec4 fragColor;

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
    // 旋轉座標
    vec2 center = vec2(0.5, 0.5);
    vec2 rotatedUV = rotate(uv, angle, center);

    // 計算目前點在網格中的位置
    vec2 grid = rotatedUV * u_resolution / cellSize;
    vec2 cell = floor(grid) + 0.5;
    vec2 cellCenter = cell * cellSize / u_resolution;

    // 距離 cell center
    float dist = length(rotatedUV - cellCenter);

    // 根據 channel 強度決定圓點半徑
    float radius = (1.0 - channel) * (cellSize / u_resolution.x) * 0.5;

    // 點內為 1，外為 0
    return dist < radius ? 1.0 : 0.0;
}

void main() {
    vec2 uv = v_texCoord;

    // 取樣原始顏色
    vec3 rgb = texture(u_image, uv).rgb;
    vec4 cmyk = rgb2cmyk(rgb);

    // 各通道半調
    float dotC = halftoneDot(cmyk.r, uv, u_cellSize, u_angleC);
    float dotM = halftoneDot(cmyk.g, uv, u_cellSize, u_angleM);
    float dotY = halftoneDot(cmyk.b, uv, u_cellSize, u_angleY);
    float dotK = halftoneDot(cmyk.a, uv, u_cellSize, u_angleK);

    // 疊合顏色（CMYK 疊色公式，這裡用簡單疊加）
    vec3 cColor = vec3(0.0, 1.0, 1.0); // Cyan
    vec3 mColor = vec3(1.0, 0.0, 1.0); // Magenta
    vec3 yColor = vec3(1.0, 1.0, 0.0); // Yellow
    vec3 kColor = vec3(0.0, 0.0, 0.0); // Black

    vec3 result = vec3(1.0); // 白底
    result -= dotC * cColor * cmyk.r;
    result -= dotM * mColor * cmyk.g;
    result -= dotY * yColor * cmyk.b;
    result -= dotK * kColor * cmyk.a;

    fragColor = vec4(result, 1.0);
}