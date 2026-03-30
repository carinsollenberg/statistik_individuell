import pandas as pd

df_raw = pd.read_csv("csv/student_depression_dataset.csv")

print(df_raw.head())
print(df_raw.shape)
print(df_raw.columns)

df_raw.dtypes()
