use std::time::Duration;

use crate::util::gen_csv_import_data;
use event_integration_test::EventIntegrationTest;
use flowy_database2::entities::{
  CalculationType, CellChangesetPB, DatabasePB, RemoveCalculationChangesetPB,
  UpdateCalculationChangesetPB,
};
use tokio::time::sleep;

#[tokio::test]
async fn calculation_integration_test1() {
  let test = EventIntegrationTest::new().await;
  test.sign_up_as_anon().await;

  let workspace_id = test.get_current_workspace().await.id;
  let payload = gen_csv_import_data("project.csv", &workspace_id);
  let view = test.import_data(payload).await.pop().unwrap();
  let database = test.open_database(&view.id).await;

  average_calculation(test, database).await;
}

// Tests for the CalculationType::Average
// Is done on the Delay column in the project.csv
async fn average_calculation(test: EventIntegrationTest, database: DatabasePB) {
  // Delay column is the 11th column (index 10) in the project.csv
  let delay_field = database.fields.get(10).unwrap();

  let calculation_changeset = UpdateCalculationChangesetPB {
    view_id: database.id.clone(),
    calculation_id: None,
    field_id: delay_field.field_id.clone(),
    calculation_type: CalculationType::Average,
  };

  test.update_calculation(calculation_changeset).await;

  // Wait for calculation update
  sleep(Duration::from_secs(1)).await;

  let all_calculations = test.get_all_calculations(&database.id).await;
  assert!(all_calculations.items.len() == 1);

  let average_calc = all_calculations.items.first().unwrap();
  assert!(average_calc.value == "14");

  // Update a cell in the delay column at fourth row (3rd index)
  let cell_changeset = CellChangesetPB {
    view_id: database.id.clone(),
    row_id: database.rows.get(3).unwrap().id.clone(),
    field_id: delay_field.field_id.clone(),
    cell_changeset: "22".to_string(),
  };
  test.update_cell(cell_changeset).await;

  let all_calculations = test.get_all_calculations(&database.id).await;
  assert!(all_calculations.items.len() == 1);

  let average_calc = all_calculations.items.first().unwrap();
  assert!(average_calc.value == "16");

  // Remove the calculation
  test
    .remove_calculate(RemoveCalculationChangesetPB {
      view_id: database.id.clone(),
      field_id: delay_field.field_id.clone(),
      calculation_id: average_calc.id.clone(),
    })
    .await;
}
