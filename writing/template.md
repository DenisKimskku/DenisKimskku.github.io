---
title: "Your Post Title"
date: "YYYY-MM-DD"
type: "Blog" | "Paper" | "Technical"
description: "Brief description of the post"
---

# Your Post Title

Write your content in markdown format here.

## Section Heading

Your content goes here.

### Subsection

More content.

## Adding Figures

To add figures to your posts:

1. Create a `figures/` directory in the same folder as your post
2. Save images as: `figures/figure-1.png`, `figure-2.jpg`, etc.
3. Reference them in markdown: `![Figure 1](figures/figure-1.png)`
4. Add captions: `*Figure 1: Description of the figure*`

Example:
```markdown
![Example Figure](figures/example.png)
*Figure 1: This is an example figure showing the concept.*
```

## Code Blocks

```python
def example_function():
    return "Hello, World!"
```

## Lists

- Item 1
- Item 2
- Item 3

## Links

[Link to external site](https://example.com)
[Link to another post](../2024-01-01/another-post)