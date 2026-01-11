"""
Visualization Pitfalls and Their Improved Visualizations

This script demonstrates 14 common pitfalls in data visualization, along with improved visualizations for each.
It saves each plot as an image file in organized directories for easy reference.

"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import networkx as nx
from sklearn.impute import SimpleImputer
from scipy.stats import sem
# Set global styles for seaborn
sns.set(style="whitegrid")

# Directory to save plots
PLOTS_DIR = 'plots'
SIN_DIR = os.path.join(PLOTS_DIR, 'sins')
IMPROVED_DIR = os.path.join(PLOTS_DIR, 'improved')

# Create directories if they don't exist
os.makedirs(SIN_DIR, exist_ok=True)
os.makedirs(IMPROVED_DIR, exist_ok=True)

# Utility function to save plots
def save_plot(filename, dpi=300):
    plt.tight_layout()
    plt.savefig(filename, dpi=dpi)
    plt.close()

# 1. Bar Plots for Mean Separation
# Sin: Using bar plots to represent means can obscure data distribution and variability.


# Generate five different distributions with similar means and SEMs but different shapes
np.random.seed(123)
n = 200
mu = 10
sigma = 5

# Create datasets with the same length
data_normal = np.random.normal(mu, sigma, n)
data_uniform = np.random.uniform(mu - np.sqrt(3) * sigma, mu + np.sqrt(3) * sigma, n)
data_exponential = np.random.exponential(mu, n)
data_gamma = np.random.gamma(shape=6, scale=mu / 6, size=n)
data_bimodal = np.concatenate([np.random.normal(mu + 6.5, 1, n // 2), np.random.normal(mu - 6, 1, n // 2)])

# Combine data into a DataFrame
data = pd.DataFrame({
    'Normal': data_normal[:n],        # Ensure all distributions have n data points
    'Uniform': data_uniform[:n],
    'Exponential': data_exponential[:n],
    'Gamma': data_gamma[:n],
    'Bimodal': data_bimodal[:n]
})
data_melted = data.melt(var_name='Distribution', value_name='Value')

# Calculate means and SEMs for each distribution
means = data.mean()
sems = data.apply(sem)

# Define group labels based on the columns in the data
groups = data.columns

# Sinful Visualization: Bar Plot with SEM (Standard Error of the Mean)
plt.figure(figsize=(10, 6))
plt.bar(groups, means, yerr=sems, capsize=5, color=['#8EC3A7', '#B6A7D1', '#FFC2B4', '#FFD700', '#B5EAEA'])
plt.ylabel('Mean Value')
plt.title('Bar Plot for Different Distributions with Similar Means and SEM (Sin)')
sin_plot1 = os.path.join(SIN_DIR, '1_sinful_bar_plot_sem.png')
plt.savefig(sin_plot1)
plt.close()

# Improved Visualization: Scatter Plot Showing Individual Data Points
plt.figure(figsize=(10, 6))
sns.stripplot(x='Distribution', y='Value', data=data_melted, jitter=True, alpha=0.6, palette=['#8EC3A7', '#B6A7D1', '#FFC2B4', '#FFD700', '#B5EAEA'])
plt.ylabel('Value')
plt.title('Scatter Plot Showing True Data Distribution (Improved)')
improved_plot1 = os.path.join(IMPROVED_DIR, '1_improved_scatter_plot.png')
plt.savefig(improved_plot1)
plt.close()
# 2. Violin Plots for Small Sample Sizes
# Sin: Violin plots can be misleading with small sample sizes due to unreliable density estimates.
# 2. Violin Plots for Small Sample Sizes
# Sin: Violin plots can be misleading with small sample sizes due to unreliable density estimates.

# Small sample data with three groups
np.random.seed(42)
groups = ['Group 1', 'Group 2', 'Group 3']
data = pd.DataFrame({
    'Group': np.repeat(groups, 5),
    'Response': np.concatenate([
        np.random.normal(1.2, 0.7, 5),
        np.random.normal(0.5, 0.25, 5),
        np.random.normal(1.9, 0.5, 5)
    ])
})

# Set up the figure with three subplots
fig, axes = plt.subplots(1, 3, figsize=(15, 6))

# Violin plot
sns.violinplot(x='Group', y='Response', data=data, ax=axes[0], palette=['#8EC3A7', '#B6A7D1', '#FFC2B4'])
sns.pointplot(x='Group', y='Response', data=data, ax=axes[0], join=False, color='black', markers='o')
axes[0].set_title("Points are median.\nThe distributions are different!\nI wonder what's going on.")
axes[0].set_ylim(-1, 3.5)

# Box plot
sns.boxplot(x='Group', y='Response', data=data, ax=axes[1], palette=['#8EC3A7', '#B6A7D1', '#FFC2B4'])
axes[1].set_title("Boxes span IQR.\nThe quartiles are different!\nI wonder what's going on.")
axes[1].set_ylim(-1, 3.5)

# Strip plot
sns.stripplot(x='Group', y='Response', data=data, ax=axes[2], palette=['#8EC3A7', '#B6A7D1', '#FFC2B4'], size=8, jitter=True)
axes[2].set_title("n = 5\nNever mind...\nToo little data to say anything.")
axes[2].set_ylim(-1, 3.5)

# Add y-axis label to the left-most plot only
axes[0].set_ylabel("Response")
for ax in axes[1:]:
    ax.set_ylabel("")

# Save the plot
plot_path = os.path.join(SIN_DIR, '2_violin_box_strip_comparison.png')
save_plot(plot_path)

print(f"Plot saved as '{plot_path}'")

# 3. Bidirectional Color Scales for Unidirectional Data
# Sin: Applying diverging color scales to data that progresses in a single direction can mislead interpretation.

# Sample data for heatmap
data_heatmap = np.random.rand(10, 10)

# Sinful Visualization: Heatmap with Diverging Color Scale
plt.figure(figsize=(8, 6))
plt.imshow(data_heatmap, cmap='coolwarm')
plt.colorbar()
plt.title('Heatmap with Diverging Color Scale (Sin)')
sin_plot3 = os.path.join(SIN_DIR, '3_heatmap_diverging_scale_sin.png')
save_plot(sin_plot3)

# Improved Visualization: Heatmap with Sequential Color Scale
plt.figure(figsize=(8, 6))
plt.imshow(data_heatmap, cmap='viridis')
plt.colorbar()
plt.title('Heatmap with Sequential Color Scale (Improved)')
improved_plot3 = os.path.join(IMPROVED_DIR, '3_heatmap_sequential_scale_improved.png')
save_plot(improved_plot3)

# Additional Example: Correct and Incorrect Color Usage in Scatter Plots

import matplotlib.colors as mcolors

# # Sample data for scatter plot color scale examples
# gene_labels = ['Gene A', 'Gene B', 'Gene C', 'Gene D', 'Gene E']
# values_min_to_max = [5, 25, 50, 75, 100]
# values_zero_centered = [-10, -5, 0, 5, 10]
# values_max_to_min = [2, 1, 0, -1, -2]
# values_no_meaningful_scale = [10, 30, 50, 80, 120]

# # Plotting each example as a scatter plot with color bars
# fig, axs = plt.subplots(2, 2, figsize=(12, 12))

# # Darkest color = Min, Lightest color = Max (Good)
# sc = axs[0, 0].scatter(values_min_to_max, gene_labels, c=values_min_to_max, cmap='viridis')
# axs[0, 0].set_title("Darkest color = Min\nLightest color = Max\nThis is good.")
# fig.colorbar(sc, ax=axs[0, 0], orientation='vertical')

# # Lightest color = 0, Darkest colors = Max absolutes (Good)
# sc = axs[0, 1].scatter(values_zero_centered, gene_labels, c=values_zero_centered, cmap='coolwarm', vmin=-10, vmax=10)
# axs[0, 1].set_title("Lightest color = 0\nDarkest colors = Max absolutes\nThis is good.")
# fig.colorbar(sc, ax=axs[0, 1], orientation='vertical')

# # Darkest color = Max, Lightest color = Min (Good)
# sc = axs[1, 0].scatter(values_max_to_min, gene_labels, c=values_max_to_min, cmap='viridis_r')
# axs[1, 0].set_title("Darkest color = Max\nLightest color = Min\nThis is good.")
# fig.colorbar(sc, ax=axs[1, 0], orientation='vertical')

# # Lightest color means nothing (sinful)
# sc = axs[1, 1].scatter(values_no_meaningful_scale, gene_labels, c=values_no_meaningful_scale, cmap='coolwarm')
# axs[1, 1].set_title("Lightest color means nothing\n(neither mean nor median).\nA data visualization sin")
# fig.colorbar(sc, ax=axs[1, 1], orientation='vertical')

# # Save the additional example plot
# color_example_plot = os.path.join(SIN_DIR, '3_color_scale_examples.png')
# save_plot(color_example_plot)


# # 4. Bar Plot Meadows
# # Sin: Overusing bar plots for multi-factorial data can clutter the visualization.
# # Load the data
# data_path = 'data/Matand_2020_Stem_Data.xlsx'
# data = pd.read_excel(data_path)

# # 4. Bar Plot Meadows
# # Sin: Overusing bar plots for multi-factorial data can clutter the visualization.

# # Sinful Visualization: Classic Bar Plot Meadow
# plt.figure(figsize=(14, 8))
# sns.barplot(x="Variety", y="Primordia", hue="Treatment", data=data, ci="sd", dodge=True, palette="gray")
# plt.xticks(rotation=45, ha="right")
# plt.ylabel("Mean Primordia Count")
# plt.title("Classic bar plot meadow\n y ~ Variety:Treatment:Explant\nThis is horrendous. What am I looking at?")
# sin_plot4 = os.path.join(SIN_DIR, '4_bar_plot_meadow_sin.png')
# plt.tight_layout()
# plt.savefig(sin_plot4, dpi=300)
# plt.close()

# # # Improved Visualization: Faceted Dot Plot for Multi-factorial Data
# # # Plot each explant type separately for each variety to enhance readability
# # g = sns.FacetGrid(data, col="Variety", row="Explant", hue="Treatment", height=4, aspect=1.2)
# # g.map(sns.stripplot, "Treatment", "Primordia", dodge=True, jitter=True, size=6, alpha=0.7)
# # g.add_legend()
# # g.set_titles("{col_name} | {row_name}")
# # g.set_axis_labels("Treatment", "Primordia Count")
# # g.fig.suptitle("Better designed for multifactorial experiments\n y ~ Treatment:Explant | Variety\nThat's better. Reader's attention is more focused.", y=1.05)
# # improved_plot4 = os.path.join(IMPROVED_DIR, '4_faceted_dot_plot_improved.png')
# # plt.tight_layout()
# # plt.savefig(improved_plot4, dpi=800)
# # plt.close()
# # Limiting the number of rows and columns
# subset_data = data[(data['Explant'].isin(data['Explant'].unique()[:3])) &
#                    (data['Variety'].isin(data['Variety'].unique()[:4]))]

# # Improved Visualization: Faceted Dot Plot for Multi-factorial Data (limited to 3 rows and 4 columns)
# g = sns.FacetGrid(subset_data, col="Variety", row="Explant", hue="Treatment", height=4, aspect=1.2)
# g.map(sns.stripplot, "Treatment", "Primordia", dodge=True, jitter=True, size=6, alpha=0.7)
# g.add_legend()
# g.set_titles("{col_name} | {row_name}")
# g.set_axis_labels("Treatment", "Primordia Count")
# g.fig.suptitle("Improved Faceted Dot Plot with Limited Rows and Columns\n y ~ Treatment:Explant | Variety", y=1.05)
# plt.tight_layout()

# # Save or display the improved plot
# improved_plot4 = os.path.join(IMPROVED_DIR, '4_faceted_dot_plot_improved_limited.png')
# plt.savefig(improved_plot4, dpi=1200)
# plt.close()

# # 5. Heatmaps Without Reordering Rows and Columns
# # Sin: Not reordering rows and columns in heatmaps can obscure patterns.

# # 6. Heatmaps Without Checking for Outliers
# # Sin: Outliers can skew color scales in heatmaps, hiding meaningful data.

# # Data with outliers
# data_with_outliers = np.random.rand(10, 10)
# data_with_outliers[0, 0] = 10  # Introduce an outlier

# # Sinful Visualization: Heatmap with Outliers
# plt.figure(figsize=(8, 6))
# sns.heatmap(data_with_outliers, cmap='viridis')
# plt.title('Heatmap with Outliers (Sin)')
# sin_plot6 = os.path.join(SIN_DIR, '6_heatmap_with_outliers_sin.png')
# save_plot(sin_plot6)

# # Improved Visualization: Heatmap with Clipped Color Scale
# plt.figure(figsize=(8, 6))
# sns.heatmap(data_with_outliers, cmap='viridis', vmax=np.percentile(data_with_outliers, 95))
# plt.title('Heatmap with Clipped Color Scale (Improved)')
# improved_plot6 = os.path.join(IMPROVED_DIR, '6_heatmap_clipped_scale_improved.png')
# save_plot(improved_plot6)

# 7. Not Checking Data Range at Each Factor Level
# Sin: Ignoring varying data ranges across factors can mislead comparisons.

# Generate sample data: Fertilizer A has a consistent height range, while Fertilizer B has a wider range
data = pd.DataFrame({
    'Fertilizer': np.repeat(['A', 'B'], 50),
    'Plant Height (cm)': np.concatenate([
        np.random.normal(20, 2, 50),  # Fertilizer A with consistent range
        np.random.normal(20, 4, 50)  # Fertilizer B with a wider range
    ])
})

# Sinful Visualization: Bar Plot with Very High Y-Axis Range
plt.figure(figsize=(8, 6))
sns.barplot(x='Fertilizer', y='Plant Height (cm)', data=data, palette='muted', ci=None)
sns.stripplot(x='Fertilizer', y='Plant Height (cm)', data=data, color='black', alpha=0.6, jitter=True)
plt.ylim(0, 2000)  # Setting a very high y-axis range to make data appear "stuck" at the bottom
plt.title('Bar Plot with Very High Y-Axis Range (Sin)')
sin_plot7 = os.path.join(SIN_DIR, '7_bar_plot_high_yaxis_sin_with_dots.png')
save_plot(sin_plot7)

# Improved Visualization: Use Log Scale to Handle Varying Ranges with Dots
plt.figure(figsize=(8, 6))
sns.barplot(x='Fertilizer', y='Plant Height (cm)', data=data, palette='muted', ci=None)
sns.stripplot(x='Fertilizer', y='Plant Height (cm)', data=data, color='black', alpha=0.6, jitter=True)
plt.yscale('log')
plt.title('Bar Plot with Log Scale (Improved)')
plt.ylabel('Plant Height (cm, Log Scale)')
improved_plot7 = os.path.join(IMPROVED_DIR, '7_bar_plot_log_scale_improved_with_dots.png')
save_plot(improved_plot7)

# 8. Network Graphs Without Trying Different Layouts
# Sin: Using a single layout for network graphs can obscure relationships.

# # Load edge data (replace with actual path if necessary)
# data_path = '/home/minseok/datavis_weekly/v2/data/Example_network_edges.xlsx'
# edges = pd.read_excel(data_path)

# # Generate a node table from edges if necessary
# nodes = pd.DataFrame({
#     'nodes': pd.concat([edges['From'], edges['To']]).unique()
# })

# # Assign modules for color coding (example modules; adjust as needed)
# nodes['module'] = pd.cut(nodes.index, bins=[-1, 9, 19, 29], labels=["Module 1", "Module 2", "Module 3"])

# # Create the network graph
# G = nx.from_pandas_edgelist(edges, 'From', 'To')

# # Define two sets of nodes for bipartite layout
# node_list = list(G.nodes)
# top_nodes = node_list[::2]  # Select alternate nodes as one set
# bottom_nodes = node_list[1::2]  # Remaining nodes as the other set

# # Define the layouts
# layouts = {
#     "circle": nx.circular_layout,
#     "star": nx.shell_layout,
#     "tree": lambda G: nx.bipartite_layout(G, top_nodes),
#     "sugiyama": nx.spring_layout,
#     "mds": nx.spring_layout,
#     "fr": nx.fruchterman_reingold_layout,
#     "kk": nx.kamada_kawai_layout,
#     "gem": nx.spring_layout,
#     "stress": nx.random_layout
# }

# # Plot each layout in a 3x3 grid
# fig, axs = plt.subplots(3, 3, figsize=(15, 15))
# axs = axs.flatten()

# for i, (name, layout_func) in enumerate(layouts.items()):
#     pos = layout_func(G)
#     axs[i].set_title(name, fontsize=15)
#     nx.draw_networkx(G, pos=pos, ax=axs[i], node_size=50, node_color='skyblue', edge_color='grey')
#     axs[i].axis('off')

# plt.suptitle("Different layouts of the SAME network", fontsize=18)
# plt.tight_layout()
# plt.subplots_adjust(top=0.92)
# plt.show()
# save_plot(os.path.join(IMPROVED_DIR, '8_network_graph_layouts_improved.png'))
# plt.close()
# # Map modules to color values
# module_colors = {"Module 1": "purple", "Module 2": "green", "Module 3": "yellow"}
# node_color_map = [module_colors.get(nodes.loc[nodes['nodes'] == node, 'module'].values[0], "grey") for node in G.nodes]

# # Define layouts
# layouts = {
#     "Circular": nx.circular_layout(G),
#     "MDS": nx.spring_layout(G, seed=42, dim=2, k=0.3),
#     "Kamada-Kawai": nx.kamada_kawai_layout(G)
# }

# # Plot network in each layout
# fig, axs = plt.subplots(1, 3, figsize=(18, 6))

# for ax, (layout_name, layout) in zip(axs, layouts.items()):
#     ax.set_title(f"{layout_name} layout")
#     nx.draw_networkx_edges(G, pos=layout, ax=ax, edge_color="grey", alpha=0.5)
#     nx.draw_networkx_nodes(G, pos=layout, ax=ax, node_size=100, node_color=node_color_map)
#     nx.draw_networkx_labels(G, pos=layout, ax=ax, font_size=8, font_color="black")
#     ax.axis('off')

# # Display legend
# for i, module in enumerate(module_colors):
#     plt.scatter([], [], color=module_colors[module], label=module)
# plt.legend(title="Stage of pathway", bbox_to_anchor=(1, 1), loc='upper left')

# # Save the plot
# output_dir = 'plots/improved'
# plt.suptitle("Comparison of Network Layouts", fontsize=16)
# plt.savefig(f"{output_dir}/network_layouts_comparison.png", dpi=300, bbox_inches='tight')
# plt.show()

from matplotlib.colors import ListedColormap
# Load the Karate Club graph
G = nx.karate_club_graph()

# Get node communities (club memberships) and assign colors based on community
club_labels = [G.nodes[node]['club'] for node in G.nodes]
color_map = ListedColormap(['skyblue', 'lightcoral'])  # Define colors for two communities
node_colors = [0 if label == 'Mr. Hi' else 1 for label in club_labels]  # Assign colors based on community
top_nodes = [node for node in G.nodes if G.nodes[node]['club'] == 'Mr. Hi']
# Define different layout algorithms
layouts = {
    "circular": nx.circular_layout,
    "shell": nx.shell_layout,
    "spring": nx.spring_layout,
    "fruchterman_reingold": nx.fruchterman_reingold_layout,
    "kamada_kawai": nx.kamada_kawai_layout,
    "spectral": nx.spectral_layout,
    "random": nx.random_layout,
    "spiral": nx.spiral_layout,
    "bipartite": lambda G: nx.bipartite_layout(G, top_nodes)
}

# Plot each layout in a grid
fig, axs = plt.subplots(3, 3, figsize=(15, 15))
axs = axs.flatten()

for i, (name, layout_func) in enumerate(layouts.items()):
    pos = layout_func(G)
    axs[i].set_title(name, fontsize=15)
    nx.draw_networkx(
        G, pos=pos, ax=axs[i],
        node_size=200,
        node_color=node_colors,
        cmap=color_map,
        edge_color='grey',
        labels={node: node for node in G.nodes},
        font_size=8,
        font_color='black'
    )
    axs[i].axis('off')

# Add an extra title for the entire figure
plt.suptitle("Different Layouts of the Karate Club Network with Labels and Colors", fontsize=18)
plt.tight_layout()
plt.subplots_adjust(top=0.92)
plt.show()

# Save the plot
save_plot(os.path.join(IMPROVED_DIR, '8_karate_network_layouts_with_labels_and_colors.png'))
plt.close()

# 9. Confusing Position-Based with Length-Based Visualizations
# Sin: Misinterpreting data by using inappropriate visual encodings.
# 9. Confusing Position-Based with Length-Based Visualizations
# Sin: Misinterpreting data by using inappropriate visual encodings.

# Sample data for response over time points
time_points = [1, 2, 3]
responses = [5, 7.5, 9]
errors = [0.5, 0.6, 0.7]

# Sinful Visualization: Bar Graph with Position-Based Data
fig, axs = plt.subplots(1, 3, figsize=(18, 6))

# Dot/Line Plot (Position-Based, Good)
axs[0].errorbar(time_points, responses, yerr=errors, fmt='o-', color='gray', ecolor='black', capsize=5)
axs[0].set_title("Dot/line graphs are position based")
axs[0].set_xlabel("Time point")
axs[0].set_ylabel("Response")
axs[0].text(1, 4.5, "Values represented by\npositions along x & y axis", ha="center", fontsize=10)

# Bar Graph (Length-Based, Good)
axs[1].bar(time_points, responses, yerr=errors, capsize=5, color=['green', 'purple', 'orange'], edgecolor='black')
axs[1].set_title("Bar graphs are length based")
axs[1].set_xlabel("Time point")
axs[1].set_ylabel("Response")
axs[1].text(1, 4.5, "Values represented by\ndistance from x axis", ha="center", fontsize=10)

# Misleading Bar Graph (Sin)
axs[2].bar(time_points, responses, yerr=errors, capsize=5, color=['green', 'purple', 'orange'], edgecolor='black')
axs[2].set_ylim(4, 10)  # Setting the y-axis to highlight misleading comparison
axs[2].set_title("NEVER DO THIS!")
axs[2].set_xlabel("Time point")
axs[2].set_ylabel("Response")
axs[2].text(1, 4.5, "Bar lengths are\nmisleading", ha="center", fontsize=10)

# Save the sinful and improved plot
sin_plot9 = os.path.join(SIN_DIR, '9_position_vs_length_sin.png')
improved_plot9 = os.path.join(IMPROVED_DIR, '9_position_vs_length_improved.png')

plt.suptitle("Position-Based vs Length-Based Visualizations", fontsize=16)
plt.tight_layout(rect=[0, 0.03, 1, 0.95])
save_plot(sin_plot9)
save_plot(improved_plot9)
plt.show()
plt.close()

# 10. Using Pie Charts
# Sin: Pie charts can be difficult to interpret, especially with many categories.

# Sample data
groups = ['Group 1', 'Group 2']
categories = ['Type I', 'Type II', 'Type III', 'Type IV']
values = [[25, 30, 20, 25], [30, 25, 15, 30]]
colors = sns.color_palette("pastel")

# Plot the side-by-side comparison
fig, axs = plt.subplots(1, 3, figsize=(18, 6))

# Sinful Visualization: Pie Charts
for i in range(2):
    axs[0].pie(values[i], labels=categories, autopct='%1.1f%%', startangle=140, colors=colors)
    axs[0].text(0, -1.5 - i*3, f"Group {i + 1}", ha='center', va='top', fontsize=12)

axs[0].set_title("Pie charts:\nArc lengths & area represent data")
axs[0].text(0, -3.5, "Hard to compare groups.\nArc length redundant with area.", ha="center", fontsize=10)

# Sinful Visualization: Donut Charts
for i in range(2):
    axs[1].pie(values[i], labels=categories, autopct='%1.1f%%', startangle=140, colors=colors, wedgeprops=dict(width=0.3))
    axs[1].text(0, -1.5 - i*3, f"Group {i + 1}", ha='center', va='top', fontsize=12)

axs[1].set_title("Donut charts:\nArc lengths represent data")
axs[1].text(0, -3.5, "Still hard to compare groups.", ha="center", fontsize=10)

# Improved Visualization: Stacked Bar Chart
df = pd.DataFrame(values, index=groups, columns=categories)
df.plot(kind='bar', stacked=True, color=colors, ax=axs[2])
axs[2].set_title("Stacked Bars:\nJust unwrap the polar coordinate!")
axs[2].set_ylabel("Percentage")
axs[2].set_xlabel("Groups")
axs[2].text(-0.5, -35, "Easier to compare groups.\nData represented by bar heights.", ha="center", fontsize=10)

# Save plots
sin_plot10 = os.path.join(SIN_DIR, '10_pie_donut_chart_sin.png')
improved_plot10 = os.path.join(IMPROVED_DIR, '10_stacked_bar_chart_improved.png')
save_plot(sin_plot10)
save_plot(improved_plot10)
plt.show()

# 11. Creating Concentric Donuts
# Sin: Concentric donut charts can mislead due to varying arc lengths.

# Sinful Visualization: Concentric Donut Chart
group_sizes = [50, 30, 20]
subgroup_sizes = [25, 25, 15, 10, 5, 10, 5, 5, 10]

fig, ax = plt.subplots(figsize=(8, 8))
ax.pie(group_sizes, radius=1, labels=['Group1', 'Group2', 'Group3'],
       colors=['#ff9999','#66b3ff','#99ff99'],
       wedgeprops=dict(width=0.3, edgecolor='w'))

ax.pie(subgroup_sizes, radius=0.7,
       colors=['#ffcccc','#ffcccc','#99ccff','#99ccff','#99ccff','#ccffcc','#ccffcc','#ccffcc','#ccffcc'],
       wedgeprops=dict(width=0.3, edgecolor='w'))
ax.set(aspect="equal")
plt.title('Concentric Donut Chart (Sin)')
sin_plot11 = os.path.join(SIN_DIR, '11_concentric_donut_chart_sin.png')
save_plot(sin_plot11)

# Improved Visualization: Stacked Bar Chart
df_donut = pd.DataFrame({
    'Group': ['Group1', 'Group1', 'Group2', 'Group2', 'Group2', 'Group3', 'Group3', 'Group3', 'Group3'],
    'Subgroup': ['A', 'B', 'A', 'B', 'C', 'A', 'B', 'C', 'D'],
    'Value': [25, 25, 15, 10, 5, 10, 5, 5, 10]
})

pivot_df = df_donut.pivot_table(index='Subgroup', columns='Group', values='Value', aggfunc='sum').fillna(0)
pivot_df.plot(kind='bar', stacked=True, color=['#ff9999','#66b3ff','#99ff99'], figsize=(8, 6))
plt.ylabel('Values')
plt.title('Stacked Bar Chart (Improved)')
plt.legend(title='Group')
improved_plot11 = os.path.join(IMPROVED_DIR, '11_stacked_bar_chart_improved.png')
save_plot(improved_plot11)

# 12. Using Red/Green and Rainbow Color Scales
# Sin: Red/green and rainbow color scales are not colorblind-friendly and can be misleading.

# Sinful Visualization: Heatmap with Rainbow Color Scale
data_rainbow = np.random.rand(10, 10)
plt.figure(figsize=(8, 6))
plt.imshow(data_rainbow, cmap='rainbow')
plt.colorbar()
plt.title('Heatmap with Rainbow Color Scale (Sin)')
sin_plot12 = os.path.join(SIN_DIR, '12_heatmap_rainbow_scale_sin.png')
save_plot(sin_plot12)

# Improved Visualization: Heatmap with 'Viridis' Color Scale
plt.figure(figsize=(8, 6))
plt.imshow(data_rainbow, cmap='viridis')
plt.colorbar()
plt.title('Heatmap with Viridis Color Scale (Improved)')
improved_plot12 = os.path.join(IMPROVED_DIR, '12_heatmap_viridis_scale_improved.png')
save_plot(improved_plot12)

# 13. Not Reordering Stacked Bar Plots
# Sin: Unordered stacked bar plots can make comparisons difficult.

# Sample data for stacked bar plot
categories_stack = ['A', 'B', 'C']
subcategories_stack = ['X', 'Y', 'Z']
values_stack = np.array([[5, 3, 2], [4, 6, 1], [7, 2, 3]])

# Sinful Visualization: Stacked Bar Plot Without Ordering
fig, ax = plt.subplots(figsize=(8, 6))
bottom = np.zeros(len(categories_stack))

for i in range(len(subcategories_stack)):
    ax.bar(categories_stack, values_stack[:, i], bottom=bottom, label=subcategories_stack[i])
    bottom += values_stack[:, i]

ax.set_ylabel('Values')
ax.set_title('Stacked Bar Plot Without Ordering (Sin)')
ax.legend(title='Subcategories')
sin_plot13 = os.path.join(SIN_DIR, '13_stacked_bar_plot_without_ordering_sin.png')
save_plot(sin_plot13)

# Improved Visualization: Ordered Stacked Bar Plot
# Calculate total values for sorting
total_values = values_stack.sum(axis=1)
sorted_indices = np.argsort(total_values)

# Sort data
categories_sorted = [categories_stack[i] for i in sorted_indices]
values_sorted = values_stack[sorted_indices, :]

# Plot ordered stacked bar chart
fig, ax = plt.subplots(figsize=(8, 6))
bottom = np.zeros(len(categories_sorted))

for i in range(len(subcategories_stack)):
    ax.bar(categories_sorted, values_sorted[:, i], bottom=bottom, label=subcategories_stack[i])
    bottom += values_sorted[:, i]

ax.set_ylabel('Values')
ax.set_title('Ordered Stacked Bar Plot (Improved)')
ax.legend(title='Subcategories')
improved_plot13 = os.path.join(IMPROVED_DIR, '13_ordered_stacked_bar_plot_improved.png')
save_plot(improved_plot13)

# 14. Mixing Stacked Bars and Mean Separation
# Sin: Combining stacked bar charts with mean separation can lead to misinterpretation.

# Sample data for sinful visualization
categories_mixed = ['A', 'B', 'C']
subcategories_mixed = ['X', 'Y']
values_mixed = np.array([[5, 3], [4, 6], [7, 2]])
errors_mixed = np.array([[0.5, 0.3], [0.4, 0.6], [0.7, 0.2]])

# Sinful Visualization: Stacked Bar Plot with Error Bars
fig, ax = plt.subplots(figsize=(8, 6))
bottom = np.zeros(len(categories_mixed))

for i in range(len(subcategories_mixed)):
    ax.bar(categories_mixed, values_mixed[:, i], bottom=bottom, yerr=errors_mixed[:, i],
           capsize=5, label=subcategories_mixed[i], alpha=0.7)
    bottom += values_mixed[:, i]

ax.set_ylabel('Values')
ax.set_title('Stacked Bar Plot with Mean Separation (Sin)')
ax.legend(title='Subcategories')
sin_plot14 = os.path.join(SIN_DIR, '14_stacked_bar_with_error_sin.png')
save_plot(sin_plot14)

# Improved Visualization: Side-by-Side Bar Chart for Mean Comparisons
x = np.arange(len(categories_mixed))
width = 0.35

fig, ax = plt.subplots(figsize=(8, 6))
rects1 = ax.bar(x - width/2, values_mixed[:, 0], width, label='X',
                yerr=errors_mixed[:, 0], capsize=5, color='skyblue')
rects2 = ax.bar(x + width/2, values_mixed[:, 1], width, label='Y',
                yerr=errors_mixed[:, 1], capsize=5, color='lightgreen')

ax.set_ylabel('Mean Values')
ax.set_title('Side-by-Side Bar Chart for Mean Comparisons (Improved)')
ax.set_xticks(x)
ax.set_xticklabels(categories_mixed)
ax.legend(title='Subcategories')
improved_plot14 = os.path.join(IMPROVED_DIR, '14_side_by_side_bar_comparisons_improved.png')
save_plot(improved_plot14)

# Close all plots to free memory
plt.close("all")

print(f"All plots have been saved in the '{PLOTS_DIR}' directory.")
