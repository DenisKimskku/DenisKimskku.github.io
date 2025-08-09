---
title: "LaTeX Formula Test"
date: "2024-07-12"
type: "Technical"
description: "Testing LaTeX formula rendering in markdown"
tags: ["LaTeX", "mathematics", "testing", "formulas"]
---

# LaTeX Formula Test

This document demonstrates LaTeX formula rendering capabilities in the new markdown system.

## Inline Mathematics

Here's an inline formula: $E = mc^2$, and another one: $\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$.

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.

## Display Mathematics

Here's a centered equation:

$$\nabla \cdot \mathbf{E} = \frac{\rho}{\epsilon_0}$$

And here's the Schrödinger equation:

$$i\hbar\frac{\partial}{\partial t}\Psi(\mathbf{r},t) = \hat{H}\Psi(\mathbf{r},t)$$

## Matrix Example

$$\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}$$

## Code with Mathematics

Here's some code alongside math:

```python
def gaussian(x, mu, sigma):
    """Gaussian distribution: f(x) = (1/σ√(2π)) * e^(-(x-μ)²/(2σ²))"""
    return (1 / (sigma * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x - mu) / sigma)**2)
```

The corresponding mathematical formula is:

$$f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}$$

## Lists and Math

1. First principle: $F = ma$
2. Second principle: $\sum F = 0$ (equilibrium)
3. Third principle: For every action, there's an equal and opposite reaction

- Energy: $E = \frac{1}{2}mv^2 + mgh$
- Momentum: $p = mv$
- Angular momentum: $L = I\omega$

## Conclusion

This demonstrates that both inline and display mathematics work correctly in the markdown rendering system, alongside regular markdown features like code blocks, lists, and text formatting.