---
title: "Your Post Title"
date: "2025-01-01"
type: "Blog"
description: "Brief description of the post"
tags: ["tag1", "tag2", "tag3"]
published: false
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

## LaTeX Mathematics

You can use inline math like $E = mc^2$ or display equations:

$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

## Links

[Link to external site](https://example.com)
[Link to another post](../2024-01-01/another-post)

## Notes for Authors

- **Simple Upload**: Just drop your `.md` file directly in the `/writing/` folder
- **File Naming**: Use descriptive names like `my-research-paper.md` or `ai-safety-thoughts.md`
- **Hashtags**: Add relevant tags to the `tags` array in frontmatter for better discoverability
- **Type**: Use "Blog", "Research", "Technical", etc.
- **Date**: Use valid YYYY-MM-DD format (e.g., "2025-08-06") for proper sorting
- **LaTeX**: Supported via MathJax - use `$...$` for inline and `$$...$$` for display math
- **Auto-Discovery**: Add your filename to `articles.json` after upload, or just ask me to update it!
- **Jekyll**: This template file is excluded from Jekyll processing - use real dates in your actual posts