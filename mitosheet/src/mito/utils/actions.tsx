import fscreen from "fscreen";
import { DEFAULT_SUPPORT_EMAIL } from "../components/elements/GetSupportButton";
import { getStartingFormula } from "../components/endo/celleditor/cellEditorUtils";
import { getColumnIndexesInSelections, getSelectedColumnIDsWithEntireSelectedColumn, getSelectedNumberSeriesColumnIDs, getSelectedRowLabelsWithEntireSelectedRow, isSelectionsOnlyColumnHeaders } from "../components/endo/selectionUtils";
import { doesAnySheetExist, doesColumnExist, doesSheetContainData, getCellDataFromCellIndexes, getDataframeIsSelected, getGraphIsSelected } from "../components/endo/utils";
import { ModalEnum } from "../components/modals/modals";
import { ControlPanelTab } from "../components/taskpanes/ControlPanel/ControlPanelTaskpane";
import { getDefaultGraphParams } from "../components/taskpanes/Graph/graphUtils";
import { ALLOW_UNDO_REDO_EDITING_TASKPANES, TaskpaneType } from "../components/taskpanes/taskpanes";
import { DISCORD_INVITE_LINK } from "../data/documentationLinks";
import { MitoAPI, getRandomId } from "../api/api";
import { getDefaultDataframeFormat } from "../pro/taskpanes/SetDataframeFormat/SetDataframeFormatTaskpane";
import { Action, ActionEnum, AnalysisData, DFSource, DataframeFormat, EditorState, GridState, SheetData, UIState, UserProfile } from "../types";
import { getColumnHeaderParts, getDisplayColumnHeader, getNewColumnHeader } from "./columnHeaders";
import { getCopyStringForClipboard, writeTextToClipboard } from "./copy";
import { FORMAT_DISABLED_MESSAGE, decreasePrecision, increasePrecision } from "./format";
import { SendFunctionStatus } from "../api/send";


export const getDefaultActionsDisabledMessage = (
    uiState: UIState,
    sendFunctionStatus: SendFunctionStatus
): string | undefined => {
    let defaultActionDisabledMessage: string | undefined = undefined;
    const disabledDueToReplayAnalysis = uiState.currOpenTaskpane.type === TaskpaneType.UPDATEIMPORTS && uiState.currOpenTaskpane.failedReplayData !== undefined;
    if (disabledDueToReplayAnalysis) {
        defaultActionDisabledMessage = 'Please resolve issues with the failed replay analysis before making further edits.';
    } else if (sendFunctionStatus === 'loading') {
        defaultActionDisabledMessage = 'Mito is still trying to connect to the backend. Please wait a moment.';
    } else if (sendFunctionStatus === 'non_working_extension_error') {
        defaultActionDisabledMessage = 'Mito is installed incorrectly. Please fix your installation and try again.';
    } else if (sendFunctionStatus === 'non_valid_location_error') {
        defaultActionDisabledMessage = 'Mito does not currently support this location. Please use Mito in JupyerLab or Jupter Notebooks.';
    } else if (sendFunctionStatus === 'no_backend_comm_registered_error') {
        defaultActionDisabledMessage = 'Kernel has been restarted. Please rerun the cell that created this mitosheet.';
    }
    return defaultActionDisabledMessage;
}

export const createActions = (
    sheetDataArray: SheetData[], 
    gridState: GridState,
    dfSources: DFSource[],
    closeOpenEditingPopups: (taskpanesToKeepIfOpen?: TaskpaneType[]) => void,
    setEditorState: React.Dispatch<React.SetStateAction<EditorState | undefined>>,
    uiState: UIState,
    setUIState: React.Dispatch<React.SetStateAction<UIState>>,
    setGridState: React.Dispatch<React.SetStateAction<GridState>>,
    mitoAPI: MitoAPI,
    mitoContainerRef: React.RefObject<HTMLDivElement>,
    analysisData: AnalysisData,
    userProfile: UserProfile,
    sendFunctionStatus: SendFunctionStatus,
): Record<ActionEnum, Action> => {
    // Define variables that we use in many actions
    const sheetIndex = gridState.sheetIndex;
    const sheetData = sheetDataArray[sheetIndex];
    const dfFormat: DataframeFormat = (sheetData?.dfFormat || getDefaultDataframeFormat());
    const startingRowIndex = gridState.selections[gridState.selections.length - 1].startingRowIndex;
    const startingColumnIndex = gridState.selections[gridState.selections.length - 1].startingColumnIndex;
    const {columnID} = getCellDataFromCellIndexes(sheetData, startingRowIndex, startingColumnIndex);
    const {startingColumnFormula, arrowKeysScrollInFormula} = getStartingFormula(sheetData, undefined, startingRowIndex, startingColumnIndex);
    const startingColumnID = columnID;
    const lastStepSummary = analysisData.stepSummaryList[analysisData.stepSummaryList.length - 1];

    // If the replay analysis taskpane is open due to a failed replay analysis, we pretty much disable all actions
    // as the user needs to resolve these errors or start a new analysis
    const defaultActionDisabledMessage: string | undefined = getDefaultActionsDisabledMessage(uiState, sendFunctionStatus);

    /*
        All of the actions that can be taken from the Action Search Bar. 
        Note: This doesn't represent *every* action that can be taken in the app. 
        For example, the Filter action opens the column control panel, but it doesn't
        actually create a filter. That is handled by the taskpane. 

        The actions are listed in 2 sections, both in alphabetical order: non-spreadsheet formulas, 
        followed by all of the spreadsheet formulas. 
    */
    const actions: Record<ActionEnum, Action> = {
        [ActionEnum.Add_Column]: {
            type: ActionEnum.Add_Column,
            shortTitle: 'Add Col',
            longTitle: 'Add column',
            actionFunction: () => {
                if (sheetDataArray.length === 0) {
                    return;
                }

                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // we close the editing taskpane if its open
                closeOpenEditingPopups();

                const newColumnHeader = 'new-column-' + getNewColumnHeader()
                // The new column should be placed 1 position to the right of the last selected column
                const newColumnHeaderIndex = gridState.selections[gridState.selections.length - 1].endingColumnIndex + 1;

                void mitoAPI.editAddColumn(
                    sheetIndex,
                    newColumnHeader,
                    newColumnHeaderIndex
                );
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : 'There are no dataframes to add columns to. Import data.'},
            searchTerms: ['add column', 'add col', 'new column', 'new col', 'insert column', 'insert col'],
            tooltip: "Add a new formula column to the right of your selection."
        },
        [ActionEnum.Catch_Up]: {
            type: ActionEnum.Catch_Up,
            shortTitle: 'Catch Up',
            longTitle: 'Catch up',
            actionFunction: () => {
                // Fast forwards to the most recent step, allowing editing
                void mitoAPI.log('click_catch_up')
                void mitoAPI.updateCheckoutStepByIndex(-1); // TODO: Check that -1 works! And below
            },
            isDisabled: () => {return analysisData.currStepIdx === lastStepSummary.step_idx ? 'You are on the most recent step, so there is nothing to catch up on.' : undefined},
            searchTerms: ['fast forward', 'catch up'],
            tooltip: "Go to the current state of the analysis."
        },
        [ActionEnum.Change_Dtype]: {
            type: ActionEnum.Change_Dtype,
            shortTitle: 'Dtype',
            longTitle: 'Change column dtype',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        toolbarDropdown: 'dtype'
                    }
                })
            },
            isDisabled: () => {
                if (!doesAnySheetExist(sheetDataArray)) {
                    return 'There are no columns to change the dtype of. Import data.';
                } 

                return defaultActionDisabledMessage;
            },
            searchTerms: ['change dtype', 'dtype', 'cast', 'boolean', 'string', 'number', 'float', 'int', 'datetime', 'date', 'timedelta'],
            tooltip: "Cast the dtype of your data column to a string, int, float, boolean, datetime, or timedelta."
        },
        [ActionEnum.Clear]: {
            type: ActionEnum.Clear,
            shortTitle: 'Clear',
            longTitle: "Clear all edits",
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // we close the editing taskpane if its open
                closeOpenEditingPopups();

                // Close all taskpanes if they are open, to make sure the state is not out of sync
                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.ClearAnalysis},
                        currOpenTaskpane: {type: TaskpaneType.NONE},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return defaultActionDisabledMessage},
            searchTerms: ['clear', 'reset', 'undo', 'redo'],
            tooltip: "Removes all of the transformations you've made to imported dataframes."
        },
        [ActionEnum.Column_Summary]: {
            type: ActionEnum.Column_Summary,
            shortTitle: 'Column Summary',
            longTitle: 'View column summary statistics ',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.CONTROL_PANEL},
                        selectedColumnControlPanelTab: ControlPanelTab.SummaryStats,
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {
                return doesColumnExist(startingColumnID, sheetIndex, sheetDataArray) ? defaultActionDisabledMessage : 'There are no columns to summarize in the selected sheet. Add data to the sheet.'
            },
            searchTerms: ['column summary', 'describe', 'stats'],
            tooltip: "Learn about the distribution of the data in the selected column."
        },
        [ActionEnum.Copy]: {
            type: ActionEnum.Copy,
            shortTitle: 'Copy',
            longTitle: 'Copy',
            actionFunction: () => {
                closeOpenEditingPopups();

                const copyStringAndSelections = getCopyStringForClipboard(
                    sheetData,
                    gridState.selections
                );

                if (copyStringAndSelections === undefined) {
                    return;
                }

                const [stringToCopy, copiedSelections] = copyStringAndSelections;
                
                void writeTextToClipboard(stringToCopy);

                setGridState(prevGridState => {
                    return {
                        ...prevGridState,
                        copiedSelections: copiedSelections
                    }
                })

                void mitoAPI.log('copied_data', {
                    'num_selections': gridState.selections.length
                });
            },
            isDisabled: () => {
                return getDataframeIsSelected(uiState, sheetDataArray) ? defaultActionDisabledMessage : "There is no selected data to copy."
            },
            searchTerms: ['copy', 'paste', 'export'],
            tooltip: "Copy the current selection to the clipboard.",
            displayKeyboardShortcuts: {
                mac: 'Cmd+C',
                windows: 'Ctrl+C'
            }
        },
        [ActionEnum.Delete_Column]: {
            type: ActionEnum.Delete_Column,
            shortTitle: 'Del Col',
            longTitle: 'Delete columns',
            actionFunction: async () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // we close the editing taskpane if its open
                closeOpenEditingPopups();

                if (isSelectionsOnlyColumnHeaders(gridState.selections)) {
                    const columnIndexesSelected = getColumnIndexesInSelections(gridState.selections);
                    const columnIDsToDelete = columnIndexesSelected.map(colIdx => sheetData?.data[colIdx]?.columnID || '').filter(columnID => columnID !== '')

                    if (columnIDsToDelete !== undefined) {
                        await mitoAPI.editDeleteColumn(
                            sheetIndex,
                            columnIDsToDelete
                        )
                    }
                } 
            },
            isDisabled: () => {
                if (!doesAnySheetExist(sheetDataArray)) {
                    return 'There are no columns to delete. Import data.';
                }

                if (doesColumnExist(startingColumnID, sheetIndex, sheetDataArray)) {
                    if (isSelectionsOnlyColumnHeaders(gridState.selections)) {
                        return defaultActionDisabledMessage
                    } else {
                        return "The selection contains individual cells. Click on column headers to select entire columns only."
                    }
                } else {
                    return "There are no columns in the dataframe to delete. Add data to the sheet."
                }
            },
            searchTerms: ['delete column', 'delete col', 'del col', 'del column', 'remove column', 'remove col'],
            tooltip: "Delete all of the selected columns from the sheet."
        },
        [ActionEnum.Delete_Dataframe]: {
            type: ActionEnum.Delete_Dataframe,
            shortTitle: 'Delete dataframe',
            longTitle: 'Delete dataframe',
            actionFunction: async () => {
                // If the sheetIndex is not 0, decrement it.
                if (sheetIndex !== 0) {
                    setUIState(prevUIState => {
                        return {
                            ...prevUIState,
                            selectedSheetIndex: sheetIndex - 1
                        }
                    })
                }

                // Close 
                closeOpenEditingPopups();

                await mitoAPI.editDataframeDelete(sheetIndex)

            },
            isDisabled: () => {
                return getDataframeIsSelected(uiState, sheetDataArray) ? defaultActionDisabledMessage : "There is no selected dataframe to delete."
            },
            searchTerms: ['delete', 'delete dataframe', 'delete sheet', 'del', 'del dataframe', 'del sheet', 'remove', 'remove dataframe', 'remove sheet'],
            tooltip: "Delete the selected sheet."
        },
        [ActionEnum.Delete_Graph]: {
            type: ActionEnum.Delete_Graph,
            shortTitle: 'Delete Graph',
            longTitle: 'Delete graph',
            actionFunction: async () => {
                if (uiState.selectedGraphID) {
                    await mitoAPI.editGraphDelete(uiState.selectedGraphID);
                }
            },
            isDisabled: () => {
                return getGraphIsSelected(uiState) ? defaultActionDisabledMessage : "There is no selected graph to delete."
            },
            searchTerms: ['delete', 'delete graph', 'delete chart', 'del', 'del chart', 'del chart', 'remove', 'remove chart', 'remove graph'],
            tooltip: "Delete the selected graph."
        },
        [ActionEnum.Delete_Row]: {
            type: ActionEnum.Delete_Row,
            shortTitle: 'Delete Row',
            longTitle: 'Delete row',
            actionFunction: async () => {
                const rowsToDelete = getSelectedRowLabelsWithEntireSelectedRow(gridState.selections, sheetData);
                if (rowsToDelete.length > 0) {
                    void mitoAPI.editDeleteRow(sheetIndex, rowsToDelete);
                }
            },
            isDisabled: () => {
                const rowsToDelete = getSelectedRowLabelsWithEntireSelectedRow(gridState.selections, sheetData);
                if (rowsToDelete.length > 0) {
                    return defaultActionDisabledMessage;
                }
                return "There are no selected rows to delete."
            },
            searchTerms: ['delete', 'delete row', 'filter rows', 'rows', 'remove rows', 'hide rows'],
            tooltip: "Delete the selected rows."
        },
        [ActionEnum.Docs]: {
            type: ActionEnum.Docs,
            shortTitle: 'Docs',
            longTitle: 'Documentation',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // We log the opening of the documentation taskpane
                void mitoAPI.log('clicked_documentation');

                // Open the documentation in a new tab - to importing because they have mito
                // installed already
                window.open('https://docs.trymito.io/how-to/importing-data-to-mito', '_blank')
            },
            isDisabled: () => {return undefined},
            searchTerms: ['docs', 'documentation', 'help', 'support'],
            tooltip: "Documentation, tutorials, and how-tos on all functionality in Mito."
        },
        [ActionEnum.Drop_Duplicates]: {
            type: ActionEnum.Drop_Duplicates,
            shortTitle: 'Dedup',
            longTitle: 'Deduplicate dataframe',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // We open the merge taskpane
                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.None},
                        currOpenTaskpane: {type: TaskpaneType.DROP_DUPLICATES},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {
                return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : "There are no dataframes to operate on. Import data."
            },
            searchTerms: ['dedup', 'deduplicate', 'same', 'remove', 'drop duplicates', 'duplicates'],
            tooltip: "Remove duplicated rows from your dataframe."
        },
        [ActionEnum.Duplicate_Dataframe]: {
            type: ActionEnum.Duplicate_Dataframe,
            shortTitle: 'Duplicate Dataframe',
            longTitle: 'Duplicate dataframe',
            actionFunction: async () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                await mitoAPI.editDataframeDuplicate(sheetIndex)
            },
            isDisabled: () => {
                return getDataframeIsSelected(uiState, sheetDataArray) ? defaultActionDisabledMessage : 'There is no selected dataframe to duplicate.'
            },
            searchTerms: ['duplicate', 'copy'],
            tooltip: "Make a copy of the selected sheet."
        },
        [ActionEnum.Duplicate_Graph]: {
            type: ActionEnum.Duplicate_Graph,
            shortTitle: 'Duplicate Graph',
            longTitle: 'Duplicate selected graph',
            actionFunction: async () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);
                
                if (uiState.selectedGraphID) {
                    const newGraphID = getRandomId()
                    await mitoAPI.editGraphDuplicate(uiState.selectedGraphID, newGraphID)
                }
            },
            isDisabled: () => {
                return getGraphIsSelected(uiState) ? defaultActionDisabledMessage : 'There is no selected graph to duplicate.'
            },
            searchTerms: ['duplicate', 'copy', 'graph'],
            tooltip: "Make a copy of the selected graph."
        },
        [ActionEnum.Export]: {
            type: ActionEnum.Export,
            shortTitle: 'Download',
            longTitle: 'Download File Now',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // We close the editing taskpane if its open
                closeOpenEditingPopups();

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.None},
                        currOpenTaskpane: {type: TaskpaneType.DOWNLOAD},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {
                return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : 'There are no dataframes to export. Import data.'
            },
            searchTerms: ['export', 'download', 'excel', 'csv'],
            tooltip: "Download dataframes as a .csv or .xlsx file."
        },
        [ActionEnum.Export_Dropdown]: {
            type: ActionEnum.Export_Dropdown,
            shortTitle: 'Export',
            longTitle: 'Open Export Dropdown',
            actionFunction: () => {
                setEditorState(undefined);
                closeOpenEditingPopups();

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        toolbarDropdown: 'export'
                    }
                })
            },
            isDisabled: () => {
                return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : 'There are no dataframes to export. Import data.'
            },
            searchTerms: ['export', 'download', 'excel', 'csv'],
            tooltip: "Export dataframes as a .csv or .xlsx file."
        },
        [ActionEnum.Fill_Na]: {
            type: ActionEnum.Fill_Na,
            shortTitle: 'Fill NaN',
            longTitle: 'Fill NaN Values',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                const selectedColumnIDs = getSelectedColumnIDsWithEntireSelectedColumn(gridState.selections, sheetData);
                
                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {
                            type: TaskpaneType.FILL_NA,
                            startingColumnIDs: selectedColumnIDs
                        },
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {
                return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : 'There is no dataframe to fill nan values within.'
            },
            searchTerms: ['fill nan', 'nan', 'find', 'replace', 'null', 'undefined', 'fill null', 'fill undefined', 'empty', 'none', 'blank'],
            tooltip: "Fill all NaN values within a dataframe or list of columns."
        },
        [ActionEnum.Filter]: {
            type: ActionEnum.Filter,
            shortTitle: 'Filter',
            longTitle: 'Filter column',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.CONTROL_PANEL},
                        selectedColumnControlPanelTab: ControlPanelTab.FilterSort,
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {
                return doesColumnExist(startingColumnID, sheetIndex, sheetDataArray) ? defaultActionDisabledMessage : 'There are no columns to filter in the selected sheet. Add data to the sheet.'
            },
            searchTerms: ['filter', 'remove', 'delete'],
            tooltip: "Filter this dataframe based on the data in a column."
        },
        [ActionEnum.Format_Number_Columns]: {
            type: ActionEnum.Format_Number_Columns,
            shortTitle: 'Number',
            longTitle: 'Format number columns',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // We close editing taskpanes
                closeOpenEditingPopups()

                // Open the format toolbar dropdown
                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        toolbarDropdown: 'format'
                    }
                })
            },
            isDisabled: () => {
                if (!doesAnySheetExist(sheetDataArray)) {
                    return 'There are no columns to format. Import data.'
                }
                
                return getSelectedNumberSeriesColumnIDs(gridState.selections, sheetData).length > 0 ? defaultActionDisabledMessage : FORMAT_DISABLED_MESSAGE
            },
            searchTerms: ['format', 'decimals', 'percent', '%', 'scientific', 'Mill', 'Bill', 'round'],
            tooltip: "Format all of the selected columns as percents, choose the number of decimals, etc. This only changes the display of the data, and does not effect the underlying dataframe."
        },
        [ActionEnum.Fullscreen]: {
            type: ActionEnum.Fullscreen,
            shortTitle: 'Fullscreen',
            longTitle: 'Toggle fullscreen',
            actionFunction: () => {
                // We toggle to the opposite of whatever the fullscreen actually is (as detected by the
                // fscreen library), and then we set the fullscreen state variable to that state (in the callback
                // above), so that the component rerenders propery
                const isNotFullscreen = fscreen.fullscreenElement === undefined || fscreen.fullscreenElement === null;
                if (isNotFullscreen && mitoContainerRef.current) {
                    fscreen.requestFullscreen(mitoContainerRef.current);
                } else {
                    fscreen.exitFullscreen();
                }

                void mitoAPI.log(
                    'button_toggle_fullscreen',
                    {
                        // Note that this is true when _end_ in fullscreen mode, and 
                        // false when we _end_ not in fullscreen mode, which is much
                        // more natural than the alternative
                        fullscreen: !!fscreen.fullscreenElement
                    }
                )
            },
            isDisabled: () => {return undefined},
            searchTerms: ['fullscreen', 'zoom'],
            tooltip: "Enter fullscreen mode to see more of your data."
        },
        [ActionEnum.Graph]: {
            type: ActionEnum.Graph,
            shortTitle: 'Graph',
            longTitle: 'Create new graph',
            actionFunction: async () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // If there is no data, prompt the user to import and nothing else
                if (sheetDataArray.length === 0) {
                    setUIState((prevUIState) => {
                        return {
                            ...prevUIState,
                            currOpenTaskpane: {
                                type: TaskpaneType.IMPORT_FIRST,
                                message: 'Before graphing data, you need to import some!'
                            }
                        }
                    })
                    return;
                }

                const newGraphID = getRandomId() // Create a new GraphID
                const graphParams = getDefaultGraphParams(sheetDataArray, sheetIndex)

                await mitoAPI.editGraph(
                    newGraphID,
                    graphParams,
                    '100%',
                    '100%',
                    getRandomId(), 
                );
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : 'There are no dataframes to graph. Import data.'},
            searchTerms: ['graph', 'chart', 'visualize', 'bar chart', 'box plot', 'scatter plot', 'histogram'],
            tooltip: "Create an interactive graph. Pick from bar charts, histograms, scatter plots, etc."
        },
        [ActionEnum.Help]: {
            type: ActionEnum.Help,
            shortTitle: 'Help',
            longTitle: 'Help',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // Open Discord
                if (userProfile.mitoConfig.MITO_CONFIG_SUPPORT_EMAIL === DEFAULT_SUPPORT_EMAIL) {
                    window.open(DISCORD_INVITE_LINK, '_blank')
                } else {
                    window.open(`mailto:${userProfile.mitoConfig.MITO_CONFIG_SUPPORT_EMAIL}?subject=Mito support request`)
                }
                
            },
            isDisabled: () => {return undefined},
            searchTerms: ['help', 'contact', 'support', 'slack', 'discord'],
            tooltip: "Join our Discord for more help."
        },
        [ActionEnum.Import_Dropdown]: {
            type: ActionEnum.Import_Dropdown,
            shortTitle: 'Import',
            longTitle: 'Open import dropdown',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // we close the editing taskpane if its open
                closeOpenEditingPopups();

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        toolbarDropdown: 'import'
                    }
                })
            },
            isDisabled: () => {return defaultActionDisabledMessage},
            searchTerms: ['import', 'upload', 'new', 'excel', 'csv', 'add'],
            tooltip: "Import any .csv or well-formatted .xlsx file as a new sheet."
        },
        [ActionEnum.Import_Files]: {
            type: ActionEnum.Import_Files,
            shortTitle: 'Import',
            longTitle: 'Import files',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // we close the editing taskpane if its open
                closeOpenEditingPopups();

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.None},
                        currOpenTaskpane: {type: TaskpaneType.IMPORT_FILES},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return defaultActionDisabledMessage},
            searchTerms: ['import', 'upload', 'new', 'excel', 'csv', 'add'],
            tooltip: "Import any .csv or well-formatted .xlsx file as a new sheet."
        },
        [ActionEnum.Merge]: {
            type: ActionEnum.Merge,
            shortTitle: 'Merge',
            longTitle: 'Merge dataframes',
            actionFunction: async () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // We open the merge taskpane
                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.None},
                        currOpenTaskpane: {type: TaskpaneType.MERGE},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return sheetDataArray.length >= 2 ? defaultActionDisabledMessage : 'You need to import at least two dataframes before you can merge them.'},
            searchTerms: ['merge', 'join', 'vlookup', 'lookup', 'anti', 'diff', 'difference', 'unique'],
            tooltip: "Merge two dataframes together using a lookup, left, right, inner, or outer join. Or find the differences between two dataframes."
        },
        [ActionEnum.Concat_Dataframes]: {
            type: ActionEnum.Concat_Dataframes,
            shortTitle: 'Concat',
            longTitle: 'Concatenate dataframes',
            actionFunction: async () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // We open the merge taskpane
                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.None},
                        currOpenTaskpane: {type: TaskpaneType.CONCAT},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return sheetDataArray.length >= 2 ? defaultActionDisabledMessage : 'You need to import at least two dataframes before you can concatenate them.'},
            searchTerms: ['stack', 'merge', 'join', 'concat', 'concatenate', 'append'],
            tooltip: "Concatenate two or more dataframes by stacking them vertically on top of eachother."
        },
        [ActionEnum.Pivot]: {
            type: ActionEnum.Pivot,
            shortTitle: 'Pivot',
            longTitle: 'Pivot table',
            actionFunction: async () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);
                
                // We check if the currently opened sheet is a result of a pivot table
                // and if so then we open the existing pivot table here, rather than
                // create a new pivot table. That is: if a user is on a pivot table, then
                // we let them edit that pivot table
                if (dfSources[sheetIndex] === DFSource.Pivoted) {
                    const response = await mitoAPI.getPivotParams(sheetIndex);
                    const existingPivotParams = 'error' in response ? undefined : response.result;
                    if (existingPivotParams !== undefined) {
                        setUIState(prevUIState => {
                            return {
                                ...prevUIState,
                                currOpenModal: {type: ModalEnum.None},
                                currOpenTaskpane: {
                                    type: TaskpaneType.PIVOT,
                                    sourceSheetIndex: existingPivotParams.sheet_index,
                                    destinationSheetIndex: sheetIndex,
                                    existingPivotParams: existingPivotParams
                                },
                                selectedTabType: 'data'
                            }
                        })

                        return;
                    } 
                } 
                /* 
                    This case just opens a new pivot table. 
                    
                    BUG: when the user has a pivot table, and deletes a dataframe
                    before it, we enter this case, as the df source of the pivot 
                    table is Pivoted, but the sheet index used to get the pivot
                    params is out of date.

                    In this case, we don't edit the pivot table, but rather open a
                    new one.

                    The fix for this bug is moving from sheet index -> sheet id, as
                    we did with column header ids!
                */
                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.None},
                        currOpenTaskpane: {
                            type: TaskpaneType.PIVOT,
                            sourceSheetIndex: sheetIndex,
                            destinationSheetIndex: undefined,
                            existingPivotParams: undefined
                        },
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : 'There are no sheets to pivot. Import data.'},
            searchTerms: ['pivot', 'group', 'group by', 'summarize', 'aggregate'],
            tooltip: "Create a Pivot Table to summarise data by breaking the data into groups and calculating statistics about each group."
        },
        [ActionEnum.Precision_Decrease]: {
            type: ActionEnum.Precision_Decrease,
            shortTitle: 'Less',
            longTitle: 'Decrease decimal places displayed',
            actionFunction: async () => {  
                closeOpenEditingPopups();

                const selectedNumberSeriesColumnIDs = getSelectedNumberSeriesColumnIDs(gridState.selections, sheetData);
                const newDfFormat: DataframeFormat = window.structuredClone(dfFormat);
                selectedNumberSeriesColumnIDs.forEach((columnID) => {
                    const columnDtype = sheetData.columnDtypeMap[columnID];
                    const newColumnFormat = decreasePrecision({...newDfFormat.columns[columnID]}, columnDtype)
                    newDfFormat.columns[columnID] = newColumnFormat;
                });

                void mitoAPI.editSetDataframeFormat(sheetIndex, newDfFormat);
            },
            isDisabled: () => {
                if (!doesAnySheetExist(sheetDataArray)) {
                    return 'There are no columns to format. Import data.'
                }
                
                return getSelectedNumberSeriesColumnIDs(gridState.selections, sheetData).length > 0 ? defaultActionDisabledMessage : FORMAT_DISABLED_MESSAGE;
            },
            searchTerms: ['format', 'round', 'decimal', 'decimal places', 'fraction'],
            tooltip: "Decrease the number of decimal places that are displayed in the selected number columns." 
        },
        [ActionEnum.Precision_Increase]: {
            type: ActionEnum.Precision_Increase,
            shortTitle: 'More',
            longTitle: 'Increase decimal places displayed',
            actionFunction: async () => {  
                closeOpenEditingPopups();

                const selectedNumberSeriesColumnIDs = getSelectedNumberSeriesColumnIDs(gridState.selections, sheetData);
                const newDfFormat: DataframeFormat = window.structuredClone(dfFormat);
                selectedNumberSeriesColumnIDs.forEach((columnID) => {
                    const columnDtype = sheetData.columnDtypeMap[columnID];
                    const newColumnFormat = increasePrecision({...newDfFormat.columns[columnID]}, columnDtype)
                    newDfFormat.columns[columnID] = newColumnFormat;
                });
                void mitoAPI.editSetDataframeFormat(sheetIndex, newDfFormat);
            },
            isDisabled: () => {
                if (!doesAnySheetExist(sheetDataArray)) {
                    return 'There are no columns to format. Import data.'
                }
                
                return getSelectedNumberSeriesColumnIDs(gridState.selections, sheetData).length > 0 ? defaultActionDisabledMessage : FORMAT_DISABLED_MESSAGE;
            },
            searchTerms: ['format', 'round', 'decimal', 'decimal places', 'fraction'],
            tooltip: "Increase the number of decimal places that are displayed in the selected number columns." 
        },
        [ActionEnum.Promote_Row_To_Header]: {
            type: ActionEnum.Promote_Row_To_Header,
            shortTitle: 'Promote to Header',
            longTitle: 'Promote Row to header',
            actionFunction: async () => {
                const rowsToPromote = getSelectedRowLabelsWithEntireSelectedRow(gridState.selections, sheetData);
                if (rowsToPromote.length > 0) {
                    void mitoAPI.editPromoteRowToHeader(sheetIndex, rowsToPromote[0]);
                }
            },
            isDisabled: () => {
                const rowsToDelete = getSelectedRowLabelsWithEntireSelectedRow(gridState.selections, sheetData);
                if (rowsToDelete.length > 0) {
                    return defaultActionDisabledMessage;
                }
                return "There is no selected row to promote to header."
            },
            searchTerms: ['make header', 'row to header', 'rename headers', 'column headers', 'promote row'],
            tooltip: "Promote the selected row to be the header of the dataframe, and delete it." 
        },
        [ActionEnum.Redo]: {
            type: ActionEnum.Redo,
            shortTitle: 'Redo',
            longTitle: 'Redo',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // We close the editing taskpane if its open
                closeOpenEditingPopups(ALLOW_UNDO_REDO_EDITING_TASKPANES);
    
                void mitoAPI.updateRedo();
            },
            isDisabled: () => {return defaultActionDisabledMessage},
            searchTerms: ['redo', 'undo'],
            tooltip: "Reapplies the last step that you undid, as long as you haven't made any edits since the undo.",
            displayKeyboardShortcuts: {
                mac: 'Cmd+Y',
                windows: 'Ctrl+Y'
            }
        },
        [ActionEnum.Rename_Column]: {
            type: ActionEnum.Rename_Column,
            shortTitle: 'Rename Column',
            longTitle: 'Rename column',
            actionFunction: () => {
                const columnHeader = getCellDataFromCellIndexes(sheetData, -1, startingColumnIndex).columnHeader;

                // Get the pieces of the column header. If the column header is not a MultiIndex header, then
                // lowerLevelColumnHeaders will be an empty array
                const columnHeaderSafe = columnHeader !== undefined ? columnHeader : ''
                const finalColumnHeader = getColumnHeaderParts(columnHeaderSafe).finalColumnHeader

                setEditorState({
                    rowIndex: -1,
                    columnIndex: startingColumnIndex,
                    formula: getDisplayColumnHeader(finalColumnHeader),
                    editorLocation: 'cell',
                    editingMode: 'specific_index_labels',
                    sheetIndex: sheetIndex
                })

            },
            isDisabled: () => {
                return doesColumnExist(startingColumnID, sheetIndex, sheetDataArray) ? defaultActionDisabledMessage : 'There are no columns in the dataframe to rename. Add data to the dataframe.'
            },
            searchTerms: ['rename', 'name', 'header'],
            tooltip: "Rename the selected column."
        },
        [ActionEnum.Rename_Dataframe]: {
            type: ActionEnum.Rename_Dataframe,
            shortTitle: 'Rename dataframe',
            longTitle: 'Rename dataframe',
            actionFunction: () => {
                // Use a query selector to get the div and then double click on it
                const selectedSheetTab = mitoContainerRef.current?.querySelector('.tab-selected') as HTMLDivElement | null;
                if (selectedSheetTab) {
                    const event = new MouseEvent('dblclick', {
                        'view': window,
                        'bubbles': true,
                        'cancelable': true
                    });
                    selectedSheetTab.dispatchEvent(event);
                }
            },
            isDisabled: () => {
                // We check if any sheet exists, instead of the specific sheet because this event is often accessed
                // very closely in time with switching the sheet indexes via double clicking. 
                return getDataframeIsSelected(uiState, sheetDataArray) ? defaultActionDisabledMessage : 'There is no selected dataframe to rename.'
            },
            searchTerms: ['rename', 'name'],
            tooltip: "Rename the selected sheet."
        },
        [ActionEnum.Rename_Graph]: {
            type: ActionEnum.Rename_Graph,
            shortTitle: 'Rename Graph',
            longTitle: 'Rename graph',
            actionFunction: () => {
                // Use a query selector to get the div and then double click on it
                const selectedSheetTab = mitoContainerRef.current?.querySelector('.tab-selected') as HTMLDivElement | null;
                if (selectedSheetTab) {
                    const event = new MouseEvent('dblclick', {
                        'view': window,
                        'bubbles': true,
                        'cancelable': true
                    });
                    selectedSheetTab.dispatchEvent(event);
                }
            },
            isDisabled: () => {
                return getGraphIsSelected(uiState) ? defaultActionDisabledMessage : 'There is not selected graph to rename.'
            },
            searchTerms: ['rename', 'name', 'graph'],
            tooltip: "Rename the selected graph."
        },
        [ActionEnum.See_All_Functionality]: {
            type: ActionEnum.See_All_Functionality,
            shortTitle: 'See All Functionality',
            longTitle: 'See all functionality',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // We log the opening of the documentation taskpane
                void mitoAPI.log('clicked_documentation');

                // Open the documentation in a new tab - to importing because they have mito
                // installed already
                window.open('https://docs.trymito.io/how-to/importing-data-to-mito', '_blank')
            },
            isDisabled: () => {return undefined},
            searchTerms: ['docs', 'documentation', 'help', 'support'],
            tooltip: "Documentation, tutorials, and how-tos on all functionality in Mito."
        },
        [ActionEnum.Set_Cell_Value]: {
            type: ActionEnum.Set_Cell_Value,
            shortTitle: 'Set Cell Value',
            longTitle: 'Set cell value',
            actionFunction: async () => {
                if (startingColumnID === undefined) {
                    return 
                }

                closeOpenEditingPopups();

                setEditorState({
                    rowIndex: startingRowIndex,
                    columnIndex: startingColumnIndex,
                    formula: startingColumnFormula,
                    // Since you can't reference other cells while setting the value of a single cell, we default to scrolling in the formula
                    arrowKeysScrollInFormula: true,
                    editorLocation: 'cell',
                    editingMode: 'specific_index_labels',
                    sheetIndex: sheetIndex
                })
            },
            isDisabled: () => {
                if (!doesColumnExist(startingColumnID, sheetIndex, sheetDataArray) || !doesSheetContainData(sheetIndex, sheetDataArray)) {
                    return 'There are no cells in the dataframe to set the value of. Add data to the sheet.'
                } 

                if (startingRowIndex === -1) {
                    return "An entire column is selected. Select a single cell to edit."
                }

                return defaultActionDisabledMessage
            },
            searchTerms: ['formula', 'function', 'edit', 'set', 'set formula', 'set column formula'],
            tooltip: "Update the value of a specific cell in a data column."
        },
        [ActionEnum.Set_Column_Formula]: {
            type: ActionEnum.Set_Column_Formula,
            shortTitle: 'Set Column Formula',
            longTitle: 'Set column formula',
            actionFunction: async () => {  
                
                closeOpenEditingPopups();

                setEditorState({
                    rowIndex: startingRowIndex !== -1 ? startingRowIndex : 0,
                    columnIndex: startingColumnIndex,
                    formula: startingColumnFormula,
                    arrowKeysScrollInFormula: arrowKeysScrollInFormula,
                    editorLocation: 'cell',
                    editingMode: 'entire_column',
                    sheetIndex: sheetIndex
                })
            },
            isDisabled: () => {
                if (!doesColumnExist(startingColumnID, sheetIndex, sheetDataArray) || !doesSheetContainData(sheetIndex, sheetDataArray)) {
                    // If there is no data in the sheet, then there is no cell editor to open!
                    return 'There are no cells in the dataframe to set the formula of. Add data to the sheet.'
                } 

                return defaultActionDisabledMessage;
            },
            searchTerms: ['formula', 'function', 'edit', 'set', 'set formula', 'set column formula'],
            tooltip: "Use one of Mito's spreadsheet formulas or basic math operators to set the column's values."
        },
        [ActionEnum.Sort]: {
            type: ActionEnum.Sort,
            shortTitle: 'Sort',
            longTitle: 'Sort column',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.CONTROL_PANEL},
                        selectedColumnControlPanelTab: ControlPanelTab.FilterSort,
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {
                return doesColumnExist(startingColumnID, sheetIndex, sheetDataArray) ? defaultActionDisabledMessage : 'There are no columns to sort in the selected sheet. Add data to the sheet.'
            },
            searchTerms: ['sort', 'ascending', 'descending', 'arrange'],
            tooltip: "Sort a column in ascending or descending order."
        },
        [ActionEnum.Split_Text_To_Column]: {
            type: ActionEnum.Split_Text_To_Column,
            shortTitle: 'Split',
            longTitle: 'Split text to columns',
            actionFunction: () => {
                closeOpenEditingPopups();

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.None},
                        currOpenTaskpane: {type: TaskpaneType.SPLIT_TEXT_TO_COLUMNS, startingColumnID: startingColumnID}
                    }
                })
            },
            isDisabled: () => {return doesColumnExist(startingColumnID, sheetIndex, sheetDataArray) ? defaultActionDisabledMessage : 'There are no columns in the selected sheet. Add data to the sheet.'},
            searchTerms: ['split', 'extract', 'parse', 'column', 'splice', 'text', 'delimiter', 'comma', 'space', 'tab', 'dash'],
            tooltip: "Split a column on a delimiter to break it into multiple columns."
        },
        [ActionEnum.Steps]: {
            type: ActionEnum.Steps,
            shortTitle: 'Steps',
            longTitle: 'Step history',
            actionFunction: () => {
                void mitoAPI.log('click_open_steps')
                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.None},
                        currOpenTaskpane: {type: TaskpaneType.STEPS},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return defaultActionDisabledMessage},
            searchTerms: ['steps', 'history'],
            tooltip: "View a list of all the edits you've made to your data."
        },
        [ActionEnum.OpenSearch]: {
            type: ActionEnum.OpenSearch,
            shortTitle: 'Search',
            longTitle: 'Search',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);
                if (uiState.currOpenSearch.isOpen) {
                    const searchInput = mitoContainerRef.current?.querySelector<HTMLInputElement>('#mito-search-bar-input');
                    if (searchInput) {
                        // If the search bar is already open, then we focus on the input and select all
                        // to make it easier to search something new without removing the previous search
                        searchInput.focus();
                        searchInput.select();
                    }
                } else {
                    setUIState(prevUIState => {
                        return {
                            ...prevUIState,
                            currOpenSearch: { ...prevUIState.currOpenSearch, isOpen: true },
                        }
                    })
                }
            },
            isDisabled: () => {return defaultActionDisabledMessage},
            searchTerms: ['search', 'find', 'filter', 'lookup'],
            tooltip: "Search for a value in your data.",
            displayKeyboardShortcuts: {
                mac: 'Cmd+F',
                windows: 'Ctrl+F'
            }
        },
        [ActionEnum.Undo]: {
            type: ActionEnum.Undo,
            shortTitle: 'Undo',
            longTitle: 'Undo',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);
        
                // We close the editing taskpane if its open
                closeOpenEditingPopups(ALLOW_UNDO_REDO_EDITING_TASKPANES);
        
                void mitoAPI.updateUndo();
            },
            isDisabled: () => {return defaultActionDisabledMessage},
            searchTerms: ['undo', 'go back', 'redo'],
            tooltip: 'Undo the most recent edit.',
            displayKeyboardShortcuts: {
                mac: 'Cmd+Z',
                windows: 'Ctrl+Z'
            }
        },
        [ActionEnum.Unique_Values]: {
            type: ActionEnum.Unique_Values,
            shortTitle: 'Unique Vals',
            longTitle: 'View unique values',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.CONTROL_PANEL},
                        selectedColumnControlPanelTab: ControlPanelTab.UniqueValues,
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {
                return doesColumnExist(startingColumnID, sheetIndex, sheetDataArray) ? defaultActionDisabledMessage : 'There are no columns in the selected sheet. Add data to the sheet.'
            },
            searchTerms: ['unique values', 'values', 'toggle', 'filter'],
            tooltip: "See a list of unique values in the column, and toggle to filter them."
        },
        [ActionEnum.Upgrade_To_Pro]: {
            type: ActionEnum.Upgrade_To_Pro,
            shortTitle: 'Upgrade to Pro',
            longTitle: 'Upgrade to Mito Pro',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.UPGRADE_TO_PRO, proOrEnterprise: 'Pro'},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return defaultActionDisabledMessage},
            searchTerms: ['pro', 'upgrade', 'mito pro', 'open source'],
            tooltip: "Upgrade to a Mito Pro account and get access to all of Mito Pro's functionality."
        },
        [ActionEnum.Transpose]: {
            type: ActionEnum.Transpose,
            shortTitle: 'Transpose Dataframe',
            longTitle: 'Transpose dataframe',
            actionFunction: () => {
                void mitoAPI.editTranspose(sheetIndex);
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : 'Import data before transposing it'},
            searchTerms: ['transpose', 'diagonal', 'rows and columns', 'flip', 'rotate'],
            tooltip: "Switches rows and columns in a dataframe"
        },
        [ActionEnum.Melt]: {
            type: ActionEnum.Melt,
            shortTitle: 'Unpivot',
            longTitle: 'Unpivot dataframe',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.MELT},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : "Import data before trying to unpivot it"},
            searchTerms: ['Melt', 'Unpivot'],
            tooltip: "Unpivot a DataFrame from wide to long format."
        },
        [ActionEnum.One_Hot_Encoding]: {
            type: ActionEnum.One_Hot_Encoding,
            shortTitle: 'One-hot Encoding',
            longTitle: 'One-hot Encoding',
            actionFunction: () => {
                if (columnID) {
                    closeOpenEditingPopups();
                    void mitoAPI.editOneHotEncoding(sheetIndex, columnID);
                }
            },
            isDisabled: () => {return doesColumnExist(startingColumnID, sheetIndex, sheetDataArray) ? defaultActionDisabledMessage : 'There are no columns in the selected sheet. Add data to the sheet.'},
            searchTerms: ['one-hot encoding', 'dummies', 'get dummies', 'categorical'],
            tooltip: "One Hot Encoding"
        },
        [ActionEnum.Set_Dataframe_Format]: {
            type: ActionEnum.Set_Dataframe_Format,
            shortTitle: 'Set Dataframe Colors',
            longTitle: 'Set dataframe colors',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.SET_DATAFRAME_FORMAT},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : 'There are no data to format. Import data before formatting.'}, 
            searchTerms: ['Set dataframe format', 'dataframe', 'format', 'color', 'color palette', 'border', 'highlight'],
            tooltip: "Change the styling of the header, rows, and border of the dataframe."
        },
        [ActionEnum.Conditional_Formatting]: {
            type: ActionEnum.Conditional_Formatting,
            shortTitle: 'Conditional Formatting',
            longTitle: 'Conditional formatting',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.CONDITIONALFORMATTING},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {
                return doesAnySheetExist(sheetDataArray) ? defaultActionDisabledMessage : 'There is no data to format. Import data.';
            },
            searchTerms: ['formatting', 'conditional', 'color', 'background', 'highlight'],
            tooltip: "Set the background color and text color of the cell based on a condition."
        },
        [ActionEnum.Dataframe_Import]: {
            type: ActionEnum.Dataframe_Import,
            shortTitle: 'Import Dataframes',
            longTitle: 'Import dataframes',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                // we close the editing taskpane if its open
                closeOpenEditingPopups();

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenModal: {type: ModalEnum.None},
                        currOpenTaskpane: {type: TaskpaneType.DATAFRAMEIMPORT},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return defaultActionDisabledMessage},
            searchTerms: ['Dataframe Import'],
            tooltip: "Dataframe Import"
        },
        [ActionEnum.UPDATEIMPORTS]: {
            type: ActionEnum.UPDATEIMPORTS,
            shortTitle: 'Change imports',
            longTitle: 'Change imported data',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.UPDATEIMPORTS},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return sendFunctionStatus !== 'finished' ? defaultActionDisabledMessage : undefined},
            searchTerms: ['update', 'imports', 'replay', 'refresh', 'change'],
            tooltip: "Change imported data to rerun the same edits on new data."
        },
        [ActionEnum.CODESNIPPETS]: {
            type: ActionEnum.CODESNIPPETS,
            shortTitle: 'Snippets',
            longTitle: 'Code Snippets',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.CODESNIPPETS},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return undefined},
            searchTerms: ['CodeSnippets'],
            tooltip: "CodeSnippets"
        },
        [ActionEnum.CODEOPTIONS]: {
            type: ActionEnum.CODEOPTIONS,
            shortTitle: 'Configure',
            longTitle: 'Configure Code',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.CODEOPTIONS},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return undefined},
            searchTerms: ['Code Options', 'function', 'parameterize'],
            tooltip: "Configure how the code is generated."
        },
        [ActionEnum.EXPORT_TO_FILE]: {
            type: ActionEnum.EXPORT_TO_FILE,
            shortTitle: 'Download File when Executing Code',
            longTitle: 'Download File when Executing Code',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.EXPORT_TO_FILE},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? undefined : 'Import data before exporting it'},
            searchTerms: ['export', 'download', 'file'],
            tooltip: "Generate code that exports dataframes to files."
        },
        [ActionEnum.RESET_AND_KEEP_INDEX]: {
            type: ActionEnum.RESET_AND_KEEP_INDEX,
            shortTitle: 'Reset and Keep Index',
            longTitle: 'Reset and Keep Index',
            actionFunction: () => {
                void mitoAPI.editResetIndex(sheetIndex, false);
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? undefined : 'Import data before resetting an index.'},
            searchTerms: ['reset', 'index'],
            tooltip: "Resets a dataframe's index to 0,1,2,3... Keeps the current index as a column in the dataframe."
        },
        [ActionEnum.RESET_AND_DROP_INDEX]: {
            type: ActionEnum.RESET_AND_DROP_INDEX,
            shortTitle: 'Reset and Drop Index',
            longTitle: 'Reset and Drop Index',
            actionFunction: () => {
                void mitoAPI.editResetIndex(sheetIndex, true);
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? undefined : 'Import data before resetting an index.'},
            searchTerms: ['reset', 'index'],
            tooltip: "Resets a dataframe's index to 0,1,2,3... Removes current index entirely."
        },
        [ActionEnum.SNOWFLAKEIMPORT]: {
            type: ActionEnum.SNOWFLAKEIMPORT,
            shortTitle: 'Snowflake Import',
            longTitle: 'Snowflake Import',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.SNOWFLAKEIMPORT},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return userProfile.mitoConfig.MITO_CONFIG_FEATURE_DISPLAY_SNOWFLAKE_IMPORT ? undefined : 'Snowflake Import is deactivated for this version of Mito. Please contact your admin with any questions.'},
            searchTerms: ['SQL', 'database', 'snowflake', 'import'],
            tooltip: "Import dataframe from a Snowflake data warehouse",
            requiredPlan: 'enterprise',
        },
        [ActionEnum.AI_TRANSFORMATION]: {
            type: ActionEnum.AI_TRANSFORMATION,
            shortTitle: 'AI',
            longTitle: 'AI Transformation',
            actionFunction: () => {
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.AITRANSFORMATION},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return userProfile.mitoConfig.MITO_CONFIG_FEATURE_DISPLAY_AI_TRANSFORMATION ? undefined : 'AI Transformation is deactivated for this version of Mito. Please contact your admin with any questions.'},
            searchTerms: ['AI Transformation'],
            tooltip: "AI Transformation"
        },
        [ActionEnum.COLUMN_HEADERS_TRANSFORM]: {
            type: ActionEnum.COLUMN_HEADERS_TRANSFORM,
            shortTitle: 'Bulk column header transform',
            longTitle: 'Bulk column headers transform',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.COLUMN_HEADERS_TRANSFORM},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return doesAnySheetExist(sheetDataArray) ? undefined : 'Import data before transforming column headers'},
            searchTerms: ['Column Headers Transform', 'replace', 'uppercase', 'lowercase', 'headers'],
            tooltip: "Allows you to capitalize, lowercase, or replace column headers in bulk."
        },
        [ActionEnum.USERDEFINEDIMPORT]: {
            type: ActionEnum.USERDEFINEDIMPORT,
            shortTitle: 'Custom Import',
            longTitle: 'Custom Import',
            actionFunction: () => {
                // We turn off editing mode, if it is on
                setEditorState(undefined);

                setUIState(prevUIState => {
                    return {
                        ...prevUIState,
                        currOpenTaskpane: {type: TaskpaneType.USERDEFINEDIMPORT},
                        selectedTabType: 'data'
                    }
                })
            },
            isDisabled: () => {return undefined},
            searchTerms: ['import', 'custom import', 'user defined import'],
            tooltip: "Import data using the custom defined imports function "
        },
        // AUTOGENERATED LINE: ACTION (DO NOT DELETE)
    
    
    
    }

    return actions
}

export const getSearchTermToActionEnumMapping = (actions: Record<ActionEnum, Action>): Record<string, ActionEnum[]> => {
    const searchTermToActionMapping: Record<string, ActionEnum[]> = {};
    Object.values(actions).forEach(action => {
        action.searchTerms.forEach(searchTerm => {
            if (!(searchTerm in searchTermToActionMapping)) {
                searchTermToActionMapping[searchTerm] = []
            }
            searchTermToActionMapping[searchTerm].push(action.type)
        })
    })
    return searchTermToActionMapping
}


/*
    Sort the provided actions in alphabetical order.
*/
export const getSortedActions = (actions: Record<ActionEnum, Action>): Action[] => {

    const actionsArray = Object.values(actions);

    actionsArray.sort(function(actionOne, actionTwo) {
        const titleOne = actionOne.longTitle ? actionOne.longTitle : actionOne.shortTitle
        const titleTwo = actionTwo.longTitle ? actionTwo.longTitle : actionTwo.shortTitle


        // Sort alphabetically
        if (titleOne < titleTwo) {
            return -1;
        }
        if (titleOne > titleTwo) {
            return 1;
        }

        return 0;
    });

    // Make sure the last two actions are Search (depreciated for now), See_All_Functionality, reguardless of the search term
    const actionEnumsToPutAtBottom: ActionEnum[] = [ActionEnum.See_All_Functionality]
    actionEnumsToPutAtBottom.forEach(actionEnum => {
        const actionIndex = actionsArray.findIndex(action => action.type === actionEnum)
        if (actionIndex !== -1) {
            actionsArray.splice(actionIndex, 1)
        }
        actionsArray.push(actions[actionEnum])
    })

    return actionsArray;
}