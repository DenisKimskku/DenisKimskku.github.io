---
layout: post
title:  "첫 번째 글"
date:   2019-11-10
excerpt: "이건 어디에 사용되는 글일꼬"
tag:
- HTML
- COMMERCE
comments: true
---

# 제목 명령어 라고 합니다...?

### 여기는 바디 부분

이거는 그냥 글이고, **이게 강조라네요**. *이거는 그냥 강조*.

HTML과 CSS가 요 코드의 핵심이래요.

### Blockquotes

> Lorem ipsum dolor sit amet, test link adipiscing elit. Nullam dignissim convallis est. Quisque aliquam.

## 리스트 타입

### 리스트 순서

1. 1번 아이템
   1. 서브1
   2. 서브2
   3. 서브3
2. 2번 아이템

### 순서 없는 리스트래

* 1번 아이템
* 2번 아이템
* 3번 아이템

## 테이블

| Header1 | Header2 | Header3 |
|:--------|:-------:|--------:|
| cell1   | cell2   | cell3   |
| cell4   | cell5   | cell6   |
|----
| cell1   | cell2   | cell3   |
| cell4   | cell5   | cell6   |
|=====
| Foot1   | Foot2   | Foot3
{: rules="groups"}

| 헤드1 | 헤드2 | 헤드3 |
|:-----|:----:|-----:|
| 1번셀 | 2번셀 | 3번셀 |
|----
|1번셀  | 2번셀 | 3번셀 |
|====
| 풋1  |   풋2 | 풋3  |
{: rules="groups"}


## Code Snippets

{% highlight css %}
#container {
  float: left;
  margin: 0 -240px 0 0;
  width: 100%;
}
{% endhighlight %}

## Buttons

Make any link standout more when applying the `.btn` class.

{% highlight html %}
<a href="#" class="btn btn-success">Success Button</a>
{% endhighlight %}

<div markdown="0"><a href="#" class="btn">Primary Button</a></div>
<div markdown="0"><a href="#" class="btn btn-success">Success Button</a></div>
<div markdown="0"><a href="#" class="btn btn-warning">Warning Button</a></div>
<div markdown="0"><a href="#" class="btn btn-danger">Danger Button</a></div>
<div markdown="0"><a href="#" class="btn btn-info">Info Button</a></div>

## KBD

You can also use `<kbd>` tag for keyboard buttons.

{% highlight html %}
<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
{% endhighlight %}

Press <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move your car. **Midtown Maddness!!**

## Notices

**Watch out!** You can also add notices by appending `{: .notice}` to a paragraph.
{: .notice}
