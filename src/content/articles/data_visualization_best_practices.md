---
title: "Friends Don't Let Friends Make Bad Graphs: A Data Visualization Guide"
date: "2025-11-03"
type: "Tutorial"
description: "A comprehensive guide to common data visualization pitfalls and how to avoid them, covering everything from bar plots vs. scatter plots to colorblind-friendly color scales."
tags: ["Data Visualization", "Statistics", "Best Practices", "ggplot2", "Scientific Communication"]
---

# Friends Don't Let Friends Make Bad Graphs: A Data Visualization Guide

Data visualization is a critical skill for researchers, analysts, and anyone who communicates with data. Yet common mistakes persist across publications, presentations, and dashboards. This guide, inspired by Chenxin Li's popular resource "Friends Don't Let Friends Make Bad Graphs," examines 14 common visualization pitfalls and provides actionable guidance for creating effective, honest, and accessible graphics.

---

## The Core Philosophy

Good data visualization should:
1. **Accurately represent the data** without distortion
2. **Highlight meaningful patterns** while acknowledging uncertainty
3. **Be accessible** to diverse audiences including colorblind viewers
4. **Match the visualization type** to the data structure and research question

Let's examine specific pitfalls and their solutions.

---

## Pitfall 1: Bar Plots for Distributions

![Comparison of bar plots with error bars versus scatter/box plots for visualizing data distributions.](/images/251103/bar_vs_scatter.png)

### The Problem

Bar plots with error bars show only the mean and standard error, hiding crucial information about the underlying distribution:
- Sample size
- Data distribution shape (bimodal, skewed, etc.)
- Individual data points
- Outliers

### Why It Matters

Two datasets can have identical means and standard errors while having completely different distributions. Bar plots mask this critical information, potentially leading to incorrect conclusions.

### The Solution

Use visualization methods that show the full data distribution:

| Method | Best For | Shows |
|--------|----------|-------|
| **Dot plots** | Small n (<30) | All individual points |
| **Box plots** | Medium n | Median, quartiles, outliers |
| **Violin plots** | Large n | Full distribution shape |
| **Beeswarm plots** | Small-medium n | Individual points with density |

**Recommendation**: Combine approaches—overlay individual points on box plots to show both summary statistics and raw data.

---

## Pitfall 2: Violin Plots Without Internal Structure

### The Problem

Violin plots show distribution shape but can hide important details:
- Sample size differences between groups
- Actual data points
- Bimodal vs. uniform distributions can look similar

### The Solution

Always pair violin plots with:
- **Internal box plots**: Show median and quartiles
- **Jittered points**: Show actual observations
- **Sample size annotations**: Make n explicit

```r
ggplot(data, aes(x = group, y = value)) +
  geom_violin() +
  geom_boxplot(width = 0.1) +
  geom_jitter(width = 0.1, alpha = 0.3)
```

---

## Pitfall 3: Wrong Color Scales

![Demonstration of sequential vs. diverging color scales and their appropriate use cases.](/images/251103/colormap_sequential.png)

### The Problem

Choosing the wrong color scale type obscures patterns or creates false ones:

- **Sequential scales** (light→dark): For data with a natural ordering from low to high
- **Diverging scales** (color→white→color): For data with a meaningful midpoint

Using sequential scales for diverging data (or vice versa) misrepresents the underlying patterns.

### Color Scale Selection Guide

| Data Type | Scale Type | Example |
|-----------|------------|---------|
| Temperature anomaly | Diverging | Blue (cold) → White (normal) → Red (hot) |
| Population density | Sequential | Light → Dark |
| Correlation matrix | Diverging | -1 → 0 → +1 |
| Elevation | Sequential | Low → High |
| Profit/Loss | Diverging | Loss → Break-even → Profit |

### The Solution

1. Identify whether your data has a meaningful midpoint
2. Choose the appropriate scale type
3. Center diverging scales on the meaningful midpoint (often 0)

---

## Pitfall 4: Unordered Heatmaps

![Comparison of raw heatmap versus reordered heatmap showing clearer patterns after clustering.](/images/251103/heatmap_reorder.png)

### The Problem

Heatmaps with arbitrary row/column ordering hide patterns that become obvious when properly organized. The human eye struggles to identify clusters and correlations in randomly ordered matrices.

### The Solution

Apply hierarchical clustering or other ordering algorithms:

```r
# Using pheatmap for automatic clustering
pheatmap(data_matrix,
         cluster_rows = TRUE,
         cluster_cols = TRUE,
         clustering_method = "complete")
```

### Ordering Strategies

| Strategy | Best For |
|----------|----------|
| **Hierarchical clustering** | Finding natural groupings |
| **Optimal leaf ordering** | Minimizing distance between adjacent items |
| **Manual ordering** | When meaningful categories exist |
| **Seriation** | Optimizing pattern visibility |

---

## Pitfall 5: Pie Charts for Comparison

![Comparison of pie charts versus bar charts for the same data, demonstrating readability differences.](/images/251103/pie_vs_bar.png)

### The Problem

Pie charts require viewers to compare angles and areas—tasks humans perform poorly. Common issues:
- Difficult to compare non-adjacent slices
- Small differences are invisible
- More than 5-6 categories become unreadable
- 3D effects make interpretation even harder

### When Pie Charts Work

- Showing parts of a whole (exactly 100%)
- Only 2-3 categories
- Differences are large (>10% between slices)
- Exact values are labeled

### Better Alternatives

| Alternative | Advantage |
|-------------|-----------|
| **Bar charts** | Easy comparison of values |
| **Stacked bar charts** | Parts of whole + comparison across groups |
| **Treemaps** | Hierarchical parts of whole |
| **Waffle charts** | Parts of whole with better area perception |

---

## Pitfall 6: Ignoring Colorblind Accessibility

![Demonstration of colorblind-friendly color palettes and problematic color combinations.](/images/251103/colorblind.png)

### The Problem

Approximately 8% of men and 0.5% of women have some form of color vision deficiency. Red-green colorblindness (deuteranopia/protanopia) is most common, making standard red-green palettes inaccessible.

### Problematic Combinations

- Red vs. Green
- Green vs. Brown
- Blue vs. Purple
- Light green vs. Yellow

### Colorblind-Safe Palettes

| Palette | Colors | Tool |
|---------|--------|------|
| **Viridis** | Yellow → Green → Blue → Purple | `viridis` package |
| **Okabe-Ito** | 8 distinct colors | Manual specification |
| **ColorBrewer** | Various safe palettes | `RColorBrewer` package |

### Additional Strategies

1. **Use shapes in addition to colors**: Different point shapes remain distinguishable
2. **Add patterns to fills**: Hatching, dots, etc.
3. **Direct labeling**: Label lines/points directly instead of using legends
4. **Test your plots**: Use colorblindness simulators

---

## Pitfall 7: Dual Y-Axes

### The Problem

Dual y-axes can:
- Create false correlations through arbitrary scaling
- Mislead viewers about relationships
- Make accurate comparison impossible

The same data can show positive correlation, negative correlation, or no correlation depending on how the axes are scaled.

### Better Alternatives

| Alternative | When to Use |
|-------------|-------------|
| **Faceted plots** | Same units, different scales |
| **Normalized data** | Different units, want to compare trends |
| **Small multiples** | Multiple time series |
| **Separate plots** | When scales are fundamentally different |

---

## Pitfall 8: Arbitrary Histogram Bins

### The Problem

Histogram appearance depends heavily on bin width:
- Too few bins: Hide distribution features
- Too many bins: Create noise
- Arbitrary boundaries: Can hide or create patterns

### The Solution

1. **Try multiple bin widths**: Ensure conclusions are robust
2. **Use principled methods**: Freedman-Diaconis, Sturges, Scott's rule
3. **Consider kernel density**: Smooth alternative to histograms
4. **Report sensitivity**: Note if patterns depend on binning

---

## Pitfall 9: Omitting Zero on Bar Charts

### The Problem

Bar charts encode values as lengths. Truncating the y-axis:
- Exaggerates small differences
- Misleads about relative magnitudes
- Violates the principle that length should be proportional to value

### When Truncation Is Acceptable

- Line charts (showing trends, not absolute values)
- When the baseline is explicitly noted
- Scientific contexts where zero is meaningless

### Best Practice

For bar charts: **always start at zero** or use a different visualization type.

---

## Pitfall 10: 3D Charts

### The Problem

3D effects on 2D displays:
- Distort relative sizes (perspective effects)
- Occlude data points
- Add visual noise without information
- Make precise reading impossible

### The Only Exception

Actual 3D data (x, y, z coordinates) may benefit from 3D visualization, but even then:
- Interactive rotation is essential
- Multiple 2D projections often work better
- Consider contour plots as alternatives

---

## Pitfall 11: Connected Scatter Plots Without Time

### The Problem

Lines between points imply:
- Continuity
- Temporal or ordinal sequence
- Meaningful interpolation

Connecting unordered points creates misleading visual patterns.

### When to Connect Points

| Connect | Don't Connect |
|---------|---------------|
| Time series | Cross-sectional data |
| Ordered categories | Unordered categories |
| Repeated measures | Independent samples |

---

## Pitfall 12: Overplotting

### The Problem

When many points overlap:
- True density is hidden
- Outliers obscure or are obscured
- Patterns become invisible

### Solutions by Data Size

| Data Size | Solution |
|-----------|----------|
| <1,000 | Jittering, transparency |
| 1,000-10,000 | 2D binning, hex plots |
| >10,000 | Contour plots, sampling |

---

## Pitfall 13: Rainbow Color Scales

### The Problem

Rainbow (jet) color scales:
- Are not perceptually uniform
- Create false boundaries
- Are colorblind-unfriendly
- Distort data interpretation

### Better Alternatives

- **Viridis family**: Perceptually uniform, colorblind-safe
- **Cubehelix**: Monotonic lightness change
- **Scientific color maps**: Designed for specific data types

---

## Pitfall 14: Missing Uncertainty

### The Problem

Point estimates without uncertainty measures:
- Overstate precision
- Hide variability
- Prevent proper interpretation

### What to Show

| Measure | Shows |
|---------|-------|
| **Standard deviation** | Data spread |
| **Standard error** | Precision of mean estimate |
| **Confidence interval** | Range of plausible values |
| **Credible interval** | Bayesian uncertainty |

Always specify which measure you're displaying.

---

## Quick Reference Checklist

Before finalizing any visualization:

- [ ] Does the chart type match the data and question?
- [ ] Is the full distribution visible (not just summary statistics)?
- [ ] Are colors colorblind-accessible?
- [ ] Is the color scale type (sequential/diverging) appropriate?
- [ ] Are categories meaningfully ordered?
- [ ] Does the y-axis start at zero (for bar charts)?
- [ ] Is uncertainty shown where appropriate?
- [ ] Are there any 3D effects that should be removed?
- [ ] Would a different chart type tell the story better?

---

## Recommended Tools

### R Packages
- `ggplot2`: Grammar of graphics
- `viridis`: Colorblind-safe palettes
- `patchwork`: Combining multiple plots
- `ggridges`: Ridge plots for distributions

### Python Libraries
- `matplotlib`: Base plotting
- `seaborn`: Statistical visualization
- `plotnine`: ggplot2 for Python
- `altair`: Declarative visualization

### Colorblindness Testing
- Coblis: Color blindness simulator
- Viz Palette: Interactive palette builder
- ColorBrewer: Pre-tested palettes

---

## Conclusion

Good data visualization is both an art and a science. The principles outlined here—showing full distributions, using appropriate color scales, ensuring accessibility, and matching visualization type to data structure—will help you create graphics that communicate honestly and effectively.

Remember: the goal is not to make data look impressive, but to reveal truth. When in doubt, choose clarity over cleverness, and always consider your audience.

---

**Reference**: Li, Chenxin. "Friends Don't Let Friends Make Bad Graphs." GitHub Repository. [https://github.com/cxli233/FriendsDontLetFriends](https://github.com/cxli233/FriendsDontLetFriends)
